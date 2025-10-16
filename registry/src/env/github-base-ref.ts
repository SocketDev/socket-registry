/**
 * GITHUB_BASE_REF environment variable snapshot.
 * GitHub pull request base branch.
 */

import { env } from 'node:process'

export const GITHUB_BASE_REF = env['GITHUB_BASE_REF']
