/**
 * NPM_REGISTRY environment variable snapshot.
 * NPM registry URL override.
 */

import { env } from 'node:process'

export const NPM_REGISTRY = env['NPM_REGISTRY']
