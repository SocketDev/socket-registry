/**
 * GITHUB_SERVER_URL environment variable snapshot.
 * GitHub server URL (e.g., https://github.com).
 */

import { env } from 'node:process'

export const GITHUB_SERVER_URL = env['GITHUB_SERVER_URL']
