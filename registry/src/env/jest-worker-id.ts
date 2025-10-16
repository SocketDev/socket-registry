/**
 * JEST_WORKER_ID environment variable snapshot.
 * Set when running tests with Jest.
 */

import { env } from 'node:process'

export const JEST_WORKER_ID = env['JEST_WORKER_ID']
