/**
 * License identifiers and copy-left license sets.
 */

// License identifiers.
export const MIT = 'MIT'
export const UNLICENCED = 'UNLICENCED'
export const UNLICENSED = 'UNLICENSED'

// Copy-left licenses.
let _copyLeftLicenses: Set<string>
export function getCopyLeftLicenses(): Set<string> {
  if (_copyLeftLicenses === undefined) {
    _copyLeftLicenses = new Set([
      'GPL',
      'GPL-2.0',
      'GPL-3.0',
      'LGPL',
      'LGPL-2.0',
      'LGPL-2.1',
      'LGPL-3.0',
      'AGPL',
      'AGPL-3.0',
      'MPL',
      'MPL-2.0',
    ])
  }
  return _copyLeftLicenses
}
