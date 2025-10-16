/**
 * GITHUB_REF_NAME environment variable snapshot.
 * GitHub branch or tag name.
 */

import { env } from 'node:process'

export const GITHUB_REF_NAME = env['GITHUB_REF_NAME']
