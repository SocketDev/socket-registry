/**
 * npm_lifecycle_event environment variable snapshot.
 * The name of the npm lifecycle event that's currently running.
 */

import { env } from 'node:process'

export const npm_lifecycle_event = env['npm_lifecycle_event']
