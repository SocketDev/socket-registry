/**
 * @file The MARKER half of the staged-publishing configurator's page
 *   classification — pure string work, no browser, so every phrase the run
 *   pauses on is unit-testable from an invented body.
 *   Two lessons are encoded here, both from live runs.
 *   The first is that a challenge phrase is not a literal. npm and Cloudflare
 *   render "Just a moment…" with a Unicode ellipsis, with three ASCII dots,
 *   with no trailing punctuation at all, in any case, and with `&hellip;` or a
 *   non-breaking space when the copy arrives HTML-escaped. Enumerating those
 *   variants as regexes is a losing game — one spelling always gets missed — so
 *   the body is NORMALIZED once and the phrases are matched against the
 *   normalized form.
 *   The second is that npm's own notice banners are not challenges. A settled
 *   access page renders dismissable banners — the 2026 warning that tokens
 *   bypassing two-factor are being restricted, and an error banner when the
 *   provenance details fail to load — and a detector reading raw page text
 *   scored those as human-verification copy. The run then waited out its full
 *   ten-minute budget with the trusted-publisher form sitting open underneath.
 *   So banner REGIONS are stripped before any phrase match (matched by their
 *   alert/banner role and class, never by blocklisting the two observed
 *   strings, which would only move the goalposts to the next banner npm ships),
 *   and — decisively — a body carrying the settings payload is never a
 *   challenge at all, whatever text renders around it.
 */

/**
 * Text reduced to the one form a marker phrase is matched against: lowercase,
 * HTML entities for space and ellipsis resolved, every ellipsis spelling
 * dropped, and all whitespace collapsed to single spaces.
 *
 * This is what makes "Just a moment…", "Just a moment...", "just a moment", and
 * "JUST A MOMENT" one phrase instead of four regexes. Normalizing once and
 * matching plain substrings also means the phrase list reads as the copy it
 * came from, so the next person can check it against a screenshot.
 */
export function normalizeChallengeText(value: string): string {
  if (!value) {
    return ''
  }
  return (
    value
      .toLowerCase()
      // The entity spellings npm's server-rendered copy arrives in.
      .replace(/&(?:#160|#xa0|nbsp);/g, ' ')
      .replace(/&(?:#8230|#x2026|hellip);/g, ' ')
      // Both ellipsis spellings, plus any longer run of dots, become a break.
      .replace(/…/g, ' ')
      .replace(/\.{2,}/g, ' ')
      // Every whitespace class, non-breaking space included, collapses.
      .replace(/[\s ]+/g, ' ')
      .trim()
  )
}

/**
 * The human-verification copy, written the way a person reads it on the page.
 * Matched against {@link normalizeChallengeText} output, so trailing
 * punctuation and case are already gone by the time these are compared.
 */
export const HUMAN_VERIFICATION_PHRASES: readonly string[] = [
  'just a moment',
  'checking if the site connection is secure',
  'checking your browser before accessing',
  'verify you are human',
  'verifying you are human',
  'additional verification required',
  'enable javascript and cookies to continue',
]

// Challenge scaffolding that is not copy: Cloudflare's own run identifiers.
// These need no normalization — they are tokens, not sentences — and they are
// decisive on their own.
const CHALLENGE_SCAFFOLD_MARKERS: readonly RegExp[] = [
  /cf-(?:browser-verification|challenge|chl-)/i,
  /_cf_chl_/i,
]

/**
 * Regions npm renders its dismissable notices in, matched by their ROLE and
 * their alert/banner class rather than by the copy inside them. Two live
 * examples drove this: the warning that npm tokens bypassing two-factor are
 * being restricted, and the error that provenance details failed to fetch.
 * Blocklisting either string would have fixed exactly those two banners and
 * nothing npm ships next.
 */
const DISMISSABLE_BANNER_PATTERN =
  /<(aside|div|section)\b[^>]*(?:role="(?:alert|status)"|class="[^"]*(?:alert|banner|callout|flash|notice)[^"]*"|data-testid="[^"]*(?:alert|banner|notice)[^"]*")[^>]*>[\s\S]*?<\/\1>/gi

/**
 * `body` with npm's dismissable notice regions removed.
 *
 * Deliberately conservative: the closing tag is matched lazily, so a banner
 * nesting another element of the same tag is trimmed short rather than
 * over-eaten. Under-stripping is the safe direction, because the decisive
 * protection against a banner false positive is
 * {@link hasSettingsPayloadMarkers}, not this. Removing the obvious regions
 * just keeps the phrase match honest on pages that carry no payload.
 */
export function stripDismissableBanners(body: string): string {
  if (!body) {
    return ''
  }
  return body.replace(DISMISSABLE_BANNER_PATTERN, ' ')
}

/**
 * Content that proves the SETTINGS PAYLOAD is present — the page's own data,
 * anchored on npm's key names and on the trusted-publisher form's input names.
 *
 * This is the decisive signal in the whole classifier. A real challenge, a
 * sign-in interstitial, and the two-factor step-up all lack every one of these:
 * a challenge has no package data to serve, and the step-up replaces the
 * settings payload rather than decorating it. So a body carrying any of them is
 * the page that was asked for, and no amount of banner copy around it changes
 * that.
 */
const SETTINGS_PAYLOAD_MARKERS: readonly RegExp[] = [
  /\\?"oidcConnections\\?"\s*:/,
  /\\?"oidcPermissionsEnabled\\?"\s*:/,
  /\\?"stagedPublishingEnabled\\?"\s*:/,
  /\\?"canEditPackage\\?"\s*:/,
  /\\?"publishingAccess\\?"\s*:/,
  /\\?"package-settings\\?"\s*:/,
  // The rendered trusted-publisher form, by the input names the fleet driver
  // fills. A form on screen is as good a receipt as the payload behind it.
  /<input[^>]+name="(?:githubEnvironmentName|repositoryName|repositoryOwner|workflowName)"/i,
  /name="(?:allowPublish|allowStagePublish)"/,
]

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  for (let i = 0, { length } = patterns; i < length; i += 1) {
    if (patterns[i]!.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Whether `body` carries the package's settings payload or its rendered
 * trusted-publisher form.
 */
export function hasSettingsPayloadMarkers(body: string): boolean {
  return !!body && matchesAny(body, SETTINGS_PAYLOAD_MARKERS)
}

/**
 * Whether `body` is a human-verification interstitial.
 *
 * Ordered so the cheap decisive facts win. A body carrying the settings payload
 * is never a challenge — that is the fix for the false positive that burned a
 * full ten-minute budget on a page whose form was already open. Otherwise the
 * notice banners come out, the remainder is normalized once, and the phrases
 * and the Cloudflare scaffolding tokens are matched against it.
 */
export function hasHumanVerificationMarkers(body: string): boolean {
  if (!body || hasSettingsPayloadMarkers(body)) {
    return false
  }
  const stripped = stripDismissableBanners(body)
  if (matchesAny(stripped, CHALLENGE_SCAFFOLD_MARKERS)) {
    return true
  }
  const normalized = normalizeChallengeText(stripped)
  if (!normalized) {
    return false
  }
  for (let i = 0, { length } = HUMAN_VERIFICATION_PHRASES; i < length; i += 1) {
    if (normalized.includes(HUMAN_VERIFICATION_PHRASES[i]!)) {
      return true
    }
  }
  return false
}
