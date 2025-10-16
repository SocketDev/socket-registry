/**
 * NPM_TOKEN environment variable snapshot.
 * Authentication token for NPM registry access.
 */

import { env } from 'node:process'

export const NPM_TOKEN = env['NPM_TOKEN']
