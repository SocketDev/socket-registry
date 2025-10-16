/**
 * APPDATA environment variable snapshot.
 * Points to the Application Data directory on Windows.
 */

import { env } from 'node:process'

export const APPDATA = env['APPDATA']
