/**
 * PRE_COMMIT environment variable snapshot.
 * Whether running in a pre-commit hook context.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const PRE_COMMIT = envAsBoolean(env['PRE_COMMIT'])
