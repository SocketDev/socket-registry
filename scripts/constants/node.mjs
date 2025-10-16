/**
 * @fileoverview Node.js-related constants.
 */

import { EOL, platform } from 'node:os'

export const DARWIN = 'darwin'
export const WIN32 = 'win32'

export const IS_DARWIN = platform() === DARWIN
export const IS_WIN32 = platform() === WIN32

export const NEWLINE = EOL

// Maintained Node.js versions.
// Manual version list: https://nodejs.org/en/about/previous-releases
// Updated October 15th, 2025.
export const maintainedNodeVersions = Object.freeze(
  Object.assign(['18.20.8', '20.19.5', '22.20.0', '24.9.0'], {
    last: '18.20.8',
    previous: '20.19.5',
    current: '22.20.0',
    next: '24.9.0',
  }),
)
