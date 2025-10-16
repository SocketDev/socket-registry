/**
 * TMPDIR environment variable snapshot.
 * Unix/macOS temporary directory path.
 */

import { env } from 'node:process'

export const TMPDIR = env['TMPDIR']
