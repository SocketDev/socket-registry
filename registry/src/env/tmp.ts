/**
 * TMP environment variable snapshot.
 * Alternative temporary directory path.
 */

import { env } from 'node:process'

export const TMP = env['TMP']
