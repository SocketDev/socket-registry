/**
 * @fileoverview URL parsing and validation utilities.
 * Provides URL validation, normalization, and parsing helpers.
 */

const BooleanCtor = Boolean
const UrlCtor = URL

/**
 * Check if a value is a valid URL.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isUrl(value: string | URL | null | undefined): boolean {
  return (
    ((typeof value === 'string' && value !== '') ||
      (value !== null && typeof value === 'object')) &&
    !!parseUrl(value)
  )
}

/**
 * Parse a value as a URL.
 */
/*@__NO_SIDE_EFFECTS__*/
export function parseUrl(value: string | URL): URL | undefined {
  try {
    return new UrlCtor(value)
  } catch {}
  return undefined
}

/**
 * Convert a URL search parameter to an array.
 */
/*@__NO_SIDE_EFFECTS__*/
export function urlSearchParamAsArray(
  value: string | null | undefined,
): string[] {
  return typeof value === 'string'
    ? value
        .trim()
        .split(/, */)
        .map(v => v.trim())
        .filter(BooleanCtor)
    : []
}

/**
 * Convert a URL search parameter to a boolean.
 */
/*@__NO_SIDE_EFFECTS__*/
export function urlSearchParamAsBoolean(
  value: string | null | undefined,
  defaultValue: boolean = false,
): boolean {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '1' || trimmed.toLowerCase() === 'true'
  }
  if (value === null || value === undefined) {
    return !!defaultValue
  }
  return !!value
}

/**
 * Helper to get array from URLSearchParams.
 */
/*@__NO_SIDE_EFFECTS__*/
export function urlSearchParamsGetArray(
  params: URLSearchParams | null | undefined,
  key: string,
): string[] {
  if (params && typeof params.getAll === 'function') {
    const values = params.getAll(key)
    // If single value contains commas, split it
    const firstValue = values[0]
    if (values.length === 1 && firstValue && firstValue.includes(',')) {
      return urlSearchParamAsArray(firstValue)
    }
    return values
  }
  return []
}

/**
 * Helper to get boolean from URLSearchParams.
 */
/*@__NO_SIDE_EFFECTS__*/
export function urlSearchParamsGetBoolean(
  params: URLSearchParams | null | undefined,
  key: string,
  defaultValue: boolean = false,
): boolean {
  if (params && typeof params.get === 'function') {
    const value = params.get(key)
    return value !== null
      ? urlSearchParamAsBoolean(value, defaultValue)
      : defaultValue
  }
  return defaultValue
}

/**
 * Create a relative URL for testing.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createRelativeUrl(path: string, base: string = ''): string {
  // Remove leading slash to make it relative.
  const relativePath = path.replace(/^\//, '')

  if (base) {
    if (!base.endsWith('/')) {
      base += '/'
    }
    return base + relativePath
  }

  return relativePath
}

/**
 * Get string value from URLSearchParams with a default.
 */
/*@__NO_SIDE_EFFECTS__*/
export function urlSearchParamAsString(
  params: URLSearchParams | null | undefined,
  key: string,
  defaultValue: string = '',
): string {
  if (params && typeof params.get === 'function') {
    const value = params.get(key)
    return value !== null ? value : defaultValue
  }
  return defaultValue
}

/**
 * Get number value from URLSearchParams with a default.
 */
/*@__NO_SIDE_EFFECTS__*/
export function urlSearchParamAsNumber(
  params: URLSearchParams | null | undefined,
  key: string,
  defaultValue: number = 0,
): number {
  if (params && typeof params.get === 'function') {
    const value = params.get(key)
    if (value !== null) {
      const num = Number(value)
      return !isNaN(num) ? num : defaultValue
    }
  }
  return defaultValue
}
