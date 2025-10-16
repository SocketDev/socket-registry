/**
 * npm_config_user_agent environment variable snapshot.
 * User agent string set by npm/pnpm/yarn package managers.
 */

import { env } from 'node:process'

export const npm_config_user_agent = env['npm_config_user_agent']
