/**
 * npm_config_registry environment variable snapshot.
 * NPM registry URL configured by package managers.
 */

import { env } from 'node:process'

export const npm_config_registry = env['npm_config_registry']
