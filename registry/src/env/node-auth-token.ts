/**
 * NODE_AUTH_TOKEN environment variable snapshot.
 * Authentication token for Node.js package registry access.
 */

import { env } from 'node:process'

export const NODE_AUTH_TOKEN = env['NODE_AUTH_TOKEN']
