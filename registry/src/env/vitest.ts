/**
 * VITEST environment variable snapshot.
 * Set when running tests with Vitest.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const VITEST = envAsBoolean(env['VITEST'])
