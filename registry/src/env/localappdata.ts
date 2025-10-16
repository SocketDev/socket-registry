/**
 * LOCALAPPDATA environment variable snapshot.
 * Points to the Local Application Data directory on Windows.
 */

import { env } from 'node:process'

export const LOCALAPPDATA = env['LOCALAPPDATA']
