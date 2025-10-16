/**
 * GITHUB_TOKEN environment variable snapshot.
 * GitHub authentication token for API access.
 */

import { env } from 'node:process'

export const GITHUB_TOKEN = env['GITHUB_TOKEN']
