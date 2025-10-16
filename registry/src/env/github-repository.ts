/**
 * GITHUB_REPOSITORY environment variable snapshot.
 * GitHub repository name in owner/repo format.
 */

import { env } from 'node:process'

export const GITHUB_REPOSITORY = env['GITHUB_REPOSITORY']
