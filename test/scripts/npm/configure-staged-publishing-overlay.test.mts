/**
 * @file Tests for the operator-attention overlay. The GUARD is what matters
 *   here — inject only during a real challenge or two-factor step-up — because
 *   an overlay that shows up during ordinary waiting trains the operator to
 *   ignore the one moment it exists for. The markup is asserted only where it
 *   is load-bearing: it must never be able to swallow the click on the verify
 *   checkbox, and it must not need a network request to render.
 */

import { describe, expect, test } from 'vitest'

import {
  buildOperatorOverlayCss,
  buildOperatorOverlayHtml,
  buildOperatorOverlayInjectionScript,
  buildOperatorOverlayRemovalScript,
  OPERATOR_OVERLAY_CAPTION,
  OPERATOR_OVERLAY_ELEMENT_ID,
  shouldShowOperatorOverlay,
} from '../../../scripts/npm/configure-staged-publishing-overlay.mts'

describe('shouldShowOperatorOverlay', () => {
  test('only a real challenge or step-up earns the shield', () => {
    expect(shouldShowOperatorOverlay('challenge')).toBe(true)
    expect(shouldShowOperatorOverlay('two-factor')).toBe(true)
  })

  test('ordinary waiting does not', () => {
    // `sign-in` is excluded on purpose: someone typing a password is already
    // looking at the window. `unsettled` is the run's own patience.
    expect(shouldShowOperatorOverlay('sign-in')).toBe(false)
    expect(shouldShowOperatorOverlay('unsettled')).toBe(false)
    expect(shouldShowOperatorOverlay('ready')).toBe(false)
    expect(shouldShowOperatorOverlay('auth')).toBe(false)
    expect(shouldShowOperatorOverlay('error')).toBe(false)
  })
})

describe('buildOperatorOverlayCss', () => {
  test('nothing in the overlay can intercept a click', () => {
    // The load-bearing rule: Cloudflare's verify checkbox sits under this, and
    // an overlay that eats that click turns a decoration into a deadlock.
    const css = buildOperatorOverlayCss()
    expect(css).toContain('pointer-events:none')
    expect(css).toContain(
      `#${OPERATOR_OVERLAY_ELEMENT_ID} *{pointer-events:none;}`,
    )
  })

  test('it sits in the lower band, clear of the centered challenge widget', () => {
    expect(buildOperatorOverlayCss()).toContain('bottom:6vh')
  })
})

describe('buildOperatorOverlayHtml', () => {
  test('the shield is inline SVG, so nothing is fetched', () => {
    // The `xmlns` is an XML namespace identifier, never fetched, so it is not
    // what this asserts against — a `src`, an `<img>`, or a CSS `url(http…)`
    // would be, and a challenge page that blocks outside origins would then
    // render an empty box.
    const html = buildOperatorOverlayHtml()
    expect(html).toContain('<svg')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src=')
    expect(html).not.toContain('url(http')
    expect(buildOperatorOverlayCss()).not.toContain('url(')
  })

  test('the caption says who is waiting and what clears it', () => {
    expect(buildOperatorOverlayHtml()).toContain(OPERATOR_OVERLAY_CAPTION)
    expect(buildOperatorOverlayHtml({ caption: 'custom' })).toContain('custom')
  })
})

describe('overlay scripts', () => {
  test('injection is idempotent by construction', () => {
    // A poll loop runs this every tick; it must do nothing when the overlay is
    // already there rather than stack a second one.
    const script = buildOperatorOverlayInjectionScript()
    expect(script).toContain('document.getElementById(elementId)')
    expect(script).toContain('return;')
  })

  test('removal is safe when nothing is injected', () => {
    const script = buildOperatorOverlayRemovalScript()
    expect(script).toContain('if (overlay) { overlay.remove(); }')
    expect(script).toContain('if (style) { style.remove(); }')
  })
})
