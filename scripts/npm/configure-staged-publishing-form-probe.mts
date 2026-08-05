/**
 * @file The in-page half of the form re-derivation: capture the STRUCTURE of
 *   npm's trusted-publisher form region and hand it back as plain data.
 *   This module only collects. It decides nothing and prints nothing — the
 *   redaction lives in `./configure-staged-publishing-form-dom.mts` and the
 *   resolution ladder in `./configure-staged-publishing-controls.mts` — so both
 *   of those stay unit-testable from invented fixtures while the one function
 *   that needs a real browser stays this small.
 *   It is a LEAF: nothing here imports another configure-staged module, so the
 *   writer and the dump lane can both use it without an import cycle.
 *   Every control is captured with its position in the page's own control
 *   query, and that index is the whole point. A snapshot describes what is
 *   there; the index is how the writer then drives the exact element the ladder
 *   chose, without inventing a selector that a restyle would break.
 *   The browser surface it touches is declared HERE, as the small structural
 *   model below, rather than by pulling TypeScript's whole `dom` lib into a
 *   Node-only program — a lib reference is program-wide, and this is the one
 *   file in the repo that runs inside a page. Declaring the handful of members
 *   the collector uses keeps it type-checked with no `any` and no cast.
 *   Nothing here navigates, clicks, or types. Capturing the form must never be
 *   able to change it — a reload is what closed the form mid-write on the run
 *   that produced this whole lane.
 */

import type { Page } from 'playwright-core'

import type { FormDomSnapshot } from './configure-staged-publishing-form-dom.mts'

/**
 * The `<option>` members the collector reads.
 */
interface DomOption {
  label: string
  selected: boolean
  value: string
}

/**
 * The element members the collector reads. Field-only members are optional, so
 * one element type covers a `<div>` and an `<input>` without a cast.
 */
interface DomElement {
  attributes: ArrayLike<{ name: string; value: string }>
  checked?: boolean | undefined
  children: ArrayLike<DomElement>
  closest: (selector: string) => DomElement | null
  contains: (other: DomElement) => boolean
  getAttribute: (name: string) => string | null
  getClientRects: () => ArrayLike<unknown>
  labels?: ArrayLike<DomElement> | undefined
  options?: ArrayLike<DomOption> | undefined
  ownerDocument: { defaultView: DomWindow | null }
  parentElement: DomElement | null
  tagName: string
  textContent: string | null
  type?: string | undefined
  value?: string | undefined
}

interface DomWindow {
  getComputedStyle: (element: DomElement) => {
    display: string
    opacity: string
    visibility: string
  }
  location: { href: string }
}

interface DomDocument {
  body: DomElement | null
  getElementById: (id: string) => DomElement | null
  querySelector: (selector: string) => DomElement | null
  querySelectorAll: (selector: string) => ArrayLike<DomElement>
}

declare const document: DomDocument
declare const window: DomWindow

/**
 * The control query both lanes agree on. The writer re-locates a chosen control
 * as `page.locator(FORM_CONTROL_SELECTOR).nth(index)`, and the index comes from
 * this same query run in the page, so the two orderings are the same document
 * order.
 */
export const FORM_CONTROL_SELECTOR =
  'input, select, textarea, button, [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"]'

const DEFAULT_MAX_DEPTH = 14
const DEFAULT_MAX_NODES = 600
// How much of an element's text is carried back. The renderer redacts anything
// that is not npm's own form vocabulary, so this cap is about transport size,
// not about safety.
const DEFAULT_MAX_TEXT = 200

/**
 * Capture the trusted-publisher form region as a structural snapshot.
 *
 * The region is resolved in order of specificity: the ancestor of the form's
 * own `workflowName` input when the form is open, then every `<form>` element,
 * then `<main>`, then `<body>`. Reporting WHICH of those answered matters — an
 * empty control list means something different when the collector was looking
 * at the form than when it was looking at the whole page.
 */
export async function collectFormDomSnapshot(
  page: Page,
  options?:
    | {
        maxDepth?: number | undefined
        maxNodes?: number | undefined
        maxText?: number | undefined
      }
    | undefined,
): Promise<FormDomSnapshot> {
  const opts = { __proto__: null, ...options } as NonNullable<typeof options>
  return await page.evaluate(
    (args: {
      controlSelector: string
      maxDepth: number
      maxNodes: number
      maxText: number
    }): FormDomSnapshot => {
      const controls = Array.from(
        document.querySelectorAll(args.controlSelector),
      )
      const controlIndexes = new Map<DomElement, number>()
      for (let i = 0, { length } = controls; i < length; i += 1) {
        controlIndexes.set(controls[i]!, i)
      }

      const readText = (el: DomElement): string | undefined => {
        const raw = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
        return raw ? raw.slice(0, args.maxText) : undefined
      }

      const readLabelText = (el: DomElement): string | undefined => {
        const { labels } = el
        if (labels?.length) {
          return readText(labels[0]!)
        }
        const wrapping = el.closest('label')
        if (wrapping) {
          return readText(wrapping)
        }
        const labelledBy = el.getAttribute('aria-labelledby')
        if (labelledBy) {
          const target = document.getElementById(labelledBy.split(/\s+/)[0]!)
          if (target) {
            return readText(target)
          }
        }
        return undefined
      }

      const isRendered = (el: DomElement): boolean => {
        if (el.getClientRects().length === 0) {
          return false
        }
        const view = el.ownerDocument.defaultView
        if (!view) {
          return true
        }
        const style = view.getComputedStyle(el)
        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          style.opacity !== '0'
        )
      }

      let captured = 0
      let truncated = false

      const describe = (
        el: DomElement,
        depth: number,
      ): FormDomSnapshot['roots'][number] | undefined => {
        if (captured >= args.maxNodes) {
          truncated = true
          return undefined
        }
        captured += 1
        const tag = el.tagName.toLowerCase()
        const attributes: Array<{ name: string; value: string }> = []
        const attrs = el.attributes
        for (let i = 0, { length } = attrs; i < length; i += 1) {
          const attr = attrs[i]!
          attributes.push({ name: attr.name, value: attr.value })
        }
        const controlIndex = controlIndexes.get(el)
        const isField =
          tag === 'input' || tag === 'select' || tag === 'textarea'
        const type = (el.type ?? '').toLowerCase()
        const selectOptions =
          tag === 'select' && el.options
            ? Array.from(el.options).map(option => ({
                label: (option.label ?? '').slice(0, args.maxText),
                selected: option.selected,
                value: option.value,
              }))
            : undefined
        const children: Array<FormDomSnapshot['roots'][number]> = []
        const elementChildren = el.children
        // Only recurse while there is depth budget left. A leaf's text is the
        // useful part; a deep subtree of styling wrappers is not.
        if (depth + 1 < args.maxDepth) {
          for (let i = 0, { length } = elementChildren; i < length; i += 1) {
            const child = describe(elementChildren[i]!, depth + 1)
            if (child) {
              children.push(child)
            }
          }
        } else if (elementChildren.length) {
          truncated = true
        }
        return {
          attributes,
          checked:
            type === 'checkbox' || type === 'radio' ? !!el.checked : undefined,
          children,
          controlIndex,
          labelText: controlIndex === undefined ? undefined : readLabelText(el),
          options: selectOptions,
          propertyValue: isField ? el.value : undefined,
          rendered: isRendered(el),
          tag,
          // Text is carried for elements with no element children — a leaf's
          // own copy — and for the tags that name a control.
          text:
            elementChildren.length === 0 ||
            tag === 'label' ||
            tag === 'legend' ||
            tag === 'button' ||
            tag === 'summary'
              ? readText(el)
              : undefined,
        }
      }

      const rootElements: DomElement[] = []
      const pushRoot = (el: DomElement | null | undefined): void => {
        if (!el) {
          return
        }
        for (let i = 0, { length } = rootElements; i < length; i += 1) {
          if (rootElements[i] === el || rootElements[i]!.contains(el)) {
            return
          }
        }
        for (let i = rootElements.length - 1; i >= 0; i -= 1) {
          if (el.contains(rootElements[i]!)) {
            rootElements.splice(i, 1)
          }
        }
        rootElements.push(el)
      }

      const strategies: string[] = []
      const workflowInput = document.querySelector('input[name="workflowName"]')
      if (workflowInput) {
        let region: DomElement = workflowInput
        for (let i = 0; i < 6 && region.parentElement; i += 1) {
          region = region.parentElement
        }
        pushRoot(region)
        strategies.push('the ancestor of input[name="workflowName"]')
      }
      const forms = document.querySelectorAll('form')
      if (forms.length) {
        for (let i = 0, { length } = forms; i < length; i += 1) {
          pushRoot(forms[i]!)
        }
        strategies.push(`${forms.length} form element(s)`)
      }
      if (!rootElements.length) {
        const main = document.querySelector('main') ?? document.body
        pushRoot(main)
        strategies.push(
          main && main.tagName.toLowerCase() === 'main'
            ? 'the main element (no form was open)'
            : 'the body element (no form and no main were found)',
        )
      }

      const roots: Array<FormDomSnapshot['roots'][number]> = []
      for (let i = 0, { length } = rootElements; i < length; i += 1) {
        const node = describe(rootElements[i]!, 0)
        if (node) {
          roots.push(node)
        }
      }
      return {
        pageUrl: window.location.href,
        rootStrategy: strategies.join(' + '),
        roots,
        truncated,
      }
    },
    {
      controlSelector: FORM_CONTROL_SELECTOR,
      maxDepth: opts.maxDepth ?? DEFAULT_MAX_DEPTH,
      maxNodes: opts.maxNodes ?? DEFAULT_MAX_NODES,
      maxText: opts.maxText ?? DEFAULT_MAX_TEXT,
    },
  )
}
