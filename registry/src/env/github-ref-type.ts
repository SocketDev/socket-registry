/**
 * GITHUB_REF_TYPE environment variable snapshot.
 * GitHub ref type (branch or tag).
 */

import { env } from 'node:process'

export const GITHUB_REF_TYPE = env['GITHUB_REF_TYPE']
