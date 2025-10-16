/**
 * @fileoverview Environment configuration constants.
 */

/**
 * Get environment configuration with inlined values.
 */
function envAsBoolean(value) {
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
    CI: envAsBoolean(env.CI),
    NODE_AUTH_TOKEN: env.NODE_AUTH_TOKEN,
    NODE_ENV: env.NODE_ENV,
    VERBOSE_BUILD: envAsBoolean(env.VERBOSE_BUILD),
  })
}
