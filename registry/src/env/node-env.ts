/**
 * NODE_ENV environment variable snapshot.
 * Indicates the Node.js environment mode (production, development, test).
 */

import { env } from 'node:process'

export const NODE_ENV = env['NODE_ENV']
