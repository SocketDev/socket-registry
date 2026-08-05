/**
 * @file The operator-attention overlay's PURE half — the decision of when to
 *   show it and the self-contained markup it injects. No playwright here, so
 *   the guard is unit-testable without a browser; the injection itself lives in
 *   `./configure-staged-publishing-browser.mts`.
 *   The overlay exists for one moment: a REAL human-verification challenge,
 *   where the run can do nothing until a person looks at the Chrome window.
 *   Nothing else earns it. A wait for a page that has not settled yet, a
 *   sign-in the operator is already mid-way through, or an OTP form they are
 *   already typing into is not an attention problem, and decorating those
 *   would train the operator to ignore the one case that matters.
 *   Everything about the markup is defensive, because the overlay is garnish
 *   and the wait is the job. The shield is the canonical brand artwork
 *   (geometry shared with socket-wheelhouse's gen suite), inlined — no network
 *   fetch, so a page whose policy blocks outside origins still renders it. The
 *   whole overlay is `pointer-events: none`, so it can never swallow the click
 *   on Cloudflare's verify checkbox; the page also dims a touch under a
 *   backdrop, with the challenge widget PROMOTED one z-index above it so the
 *   checkbox stays bright while everything else recedes. The shield drifts in
 *   the LOWER-center band, clear of the challenge widget, which Cloudflare
 *   centers.
 */

import type { AccessPageReadiness } from './configure-staged-publishing-session.mts'

/**
 * The element id the overlay is injected under. Injection is idempotent by
 * looking this up first, and removal is a single query, so a poll loop can call
 * both every tick without stacking overlays or thrashing the DOM.
 */
export const OPERATOR_OVERLAY_ELEMENT_ID = 'socket-operator-overlay'

/**
 * The caption under the shield. Says who is waiting and what clears it, in one
 * line, because it renders over someone else's page and has no room to explain.
 */
export const OPERATOR_OVERLAY_CAPTION =
  'Socket is waiting for you — solve the check above'

/**
 * Whether a readiness state has earned the overlay.
 *
 * Only `challenge` (Cloudflare's interstitial): the one state a person clears
 * by acting on something the page centers ABOVE this overlay. `two-factor` is
 * deliberately excluded — the operator typing an OTP is already looking at the
 * window, and "solve the check above" over an OTP form is the wrong sentence
 * (observed 2026-08-05). `sign-in` is excluded for the same mid-way reason,
 * and `unsettled` is the run's own patience, not a request for attention.
 */
export function shouldShowOperatorOverlay(
  readiness: AccessPageReadiness,
): boolean {
  return readiness === 'challenge'
}

// The canonical brand shield + bolt, verbatim from the shared geometry
// (socket-wheelhouse scripts/repo/gen/geometry.mts SHIELD_PATH /
// SMALL_BOLT_PATH), inlined so the overlay needs no network and no
// same-origin asset. A hand-wrapped copy of the bolt previously dropped an
// arc flag mid-concatenation ("a.456.456 0 0-.456" for "a.456.456 0 0
// 0-.456"), which misparsed the arc and rendered a corrupt bolt — single
// verbatim strings, never re-wrapped by hand. The gradient id is namespaced:
// the overlay renders inside npm's document, where a bare id would be free to
// collide with the page's own defs.
const SHIELD_PATH =
  'M18.438 8.839c.462.165.767.603.762 1.094v-.001c-.04 3.585.231 8.64-.38 10.885-1.04 4.504-4.42 8.397-8.798 10.102a1.17 1.17 0 0 1-.838.005C4.518 29.148.918 24.731.18 19.801c-.059-.311-.092-.675-.13-.984-.038-.206-.049-1.14-.049-5.167 0-1.971.001-3.099.007-3.738a1.15 1.15 0 0 1 .757-1.07c2.8-1.021 5.375-1.936 8.186-2.963l.249-.09c.249-.09.519-.091.769-.004.627.218 1.595.578 2.237.806 2.022.727 4.179 1.512 6.231 2.248'

const BOLT_PATH =
  'M9.886 9.538c.192-.314.675-.178.675.19v5.85c0 .251.204.455.456.455h2.736c.285 0 .46.312.311.555l-4.909 8.038c-.192.314-.675.179-.675-.19v-5.849a.456.456 0 0 0-.456-.456H5.288a.365.365 0 0 1-.311-.554z'

const SHIELD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 5.721 19.226 25.279" ' +
  'role="img" aria-label="Socket" width="96" height="126">' +
  '<defs><linearGradient id="socket-operator-overlay-gradient" x1="0" y1="0" x2="1" y2="0">' +
  '<stop offset="0%" stop-color="#ff00aa"/><stop offset="100%" stop-color="#8c50ff"/>' +
  '</linearGradient></defs>' +
  `<path fill="url(#socket-operator-overlay-gradient)" d="${SHIELD_PATH}"/>` +
  `<path class="socket-operator-overlay-bolt" fill="#ffffff" d="${BOLT_PATH}"/>` +
  '</svg>'

/**
 * The overlay's stylesheet. The root is one z-index BELOW the promoted
 * challenge widget, so the backdrop dims the page while Cloudflare's checkbox
 * stays bright and fully clickable above it — and `pointer-events: none` at
 * every level means no part of the overlay can intercept a click even where
 * it does sit on top. The drift and glow are transform/filter animations,
 * which the compositor handles without laying the page out again — a
 * challenge page under a busy animation is a page that scrolls badly.
 */
export function buildOperatorOverlayCss(): string {
  return [
    `#${OPERATOR_OVERLAY_ELEMENT_ID}{`,
    'position:fixed;inset:0;z-index:2147483646;',
    'pointer-events:none;user-select:none;}',
    `#${OPERATOR_OVERLAY_ELEMENT_ID} *{pointer-events:none;}`,
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-backdrop{`,
    'position:fixed;inset:0;background:rgba(12,6,24,.38);}',
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-band{`,
    'position:fixed;left:0;right:0;bottom:6vh;',
    'display:flex;flex-direction:column;align-items:center;gap:12px;}',
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-shield{`,
    'animation:socket-operator-overlay-drift 3.6s ease-in-out infinite;',
    'filter:drop-shadow(0 8px 24px rgba(0,0,0,.35));}',
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-bolt{`,
    'animation:socket-operator-overlay-glow 3.6s ease-in-out infinite;}',
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-caption{`,
    'font:600 15px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;',
    'color:#fff;background:rgba(20,10,35,.86);border-radius:999px;',
    'padding:8px 18px;letter-spacing:.01em;}',
    '@keyframes socket-operator-overlay-drift{',
    '0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
    '@keyframes socket-operator-overlay-glow{',
    '0%,100%{filter:drop-shadow(0 0 2px rgba(255,255,255,.75)) drop-shadow(0 0 8px rgba(255,255,255,.4))}',
    '50%{filter:drop-shadow(0 0 4px rgba(255,255,255,.95)) drop-shadow(0 0 14px rgba(255,255,255,.7))}}',
    // The challenge widget rides ONE above the overlay root, so the dim never
    // covers the thing the caption points at. Conservative selectors: the
    // turnstile iframe, its wrapper class, and the interstitial's stage node.
    'iframe[src*="challenges.cloudflare.com"],.cf-turnstile,#challenge-stage{',
    'position:relative!important;z-index:2147483647!important;}',
    '@media (prefers-reduced-motion:reduce){',
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-shield,`,
    `#${OPERATOR_OVERLAY_ELEMENT_ID} .socket-operator-overlay-bolt{animation:none}}`,
  ].join('')
}

/**
 * The overlay's markup, caption included. Self-contained: no `<img>`, no
 * `<link>`, no font file, nothing that needs a request to render.
 */
export function buildOperatorOverlayHtml(
  options?: { caption?: string | undefined } | undefined,
): string {
  const opts = { __proto__: null, ...options } as NonNullable<typeof options>
  const caption = opts.caption ?? OPERATOR_OVERLAY_CAPTION
  return (
    `<div id="${OPERATOR_OVERLAY_ELEMENT_ID}" aria-hidden="true">` +
    '<div class="socket-operator-overlay-backdrop"></div>' +
    '<div class="socket-operator-overlay-band">' +
    `<div class="socket-operator-overlay-shield">${SHIELD_SVG}</div>` +
    `<div class="socket-operator-overlay-caption">${caption}</div>` +
    '</div>' +
    '</div>'
  )
}

/**
 * The injection as SOURCE, handed to playwright's `evaluate` as a string.
 *
 * A string rather than a function for one boring reason: this repo's TypeScript
 * project carries no DOM library, so a real function body referencing
 * `document` does not type-check. Building the source here keeps the DOM work
 * in one auditable place and makes it assertable in a unit test without a
 * browser — which is the only way any of it gets checked, since a page is not
 * something a unit test has.
 *
 * The script is idempotent by construction: it returns early when the element
 * is already there, so a poll loop can run it every tick.
 */
export function buildOperatorOverlayInjectionScript(
  options?: { caption?: string | undefined } | undefined,
): string {
  const html = JSON.stringify(buildOperatorOverlayHtml(options))
  const css = JSON.stringify(buildOperatorOverlayCss())
  const elementId = JSON.stringify(OPERATOR_OVERLAY_ELEMENT_ID)
  const styleId = JSON.stringify(`${OPERATOR_OVERLAY_ELEMENT_ID}-style`)
  return [
    '(() => {',
    `const elementId = ${elementId};`,
    `const styleId = ${styleId};`,
    'if (document.getElementById(elementId)) { return; }',
    'if (!document.getElementById(styleId)) {',
    'const style = document.createElement("style");',
    'style.id = styleId;',
    `style.textContent = ${css};`,
    'document.head.append(style);',
    '}',
    'const host = document.createElement("div");',
    `host.innerHTML = ${html};`,
    'const node = host.firstElementChild;',
    'if (node) { document.body.append(node); }',
    '})()',
  ].join('')
}

/**
 * The removal as source, same reasoning. Safe to run when nothing is injected.
 */
export function buildOperatorOverlayRemovalScript(): string {
  const elementId = JSON.stringify(OPERATOR_OVERLAY_ELEMENT_ID)
  const styleId = JSON.stringify(`${OPERATOR_OVERLAY_ELEMENT_ID}-style`)
  return [
    '(() => {',
    `const overlay = document.getElementById(${elementId});`,
    'if (overlay) { overlay.remove(); }',
    `const style = document.getElementById(${styleId});`,
    'if (style) { style.remove(); }',
    '})()',
  ].join('')
}
