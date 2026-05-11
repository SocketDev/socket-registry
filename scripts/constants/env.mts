/**
 * @fileoverview Environment configuration constants.
 */

/**
 * Get environment configuration with inlined values.
 */
export function envAsBoolean(value: string | undefined): boolean {
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    return lower === 'true' || lower === '1'
  }
  return Boolean(value)
}

/**
 * Get environment configuration.
 */
export function getEnv() {
  const { env } = process
  return Object.freeze({
    __proto__: null,
    CI: envAsBoolean(env['CI']),
    NODE_ENV: env['NODE_ENV'],
    VERBOSE_BUILD: envAsBoolean(env['VERBOSE_BUILD']),
  })
}
