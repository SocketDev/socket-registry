/**
 * CI environment variable snapshot.
 * Determines if code is running in a Continuous Integration environment.
 */

import { env } from 'node:process'

import { envAsBoolean } from './helpers'

export const CI = envAsBoolean(env['CI'])
