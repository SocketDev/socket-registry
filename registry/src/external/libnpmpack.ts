// Duplicated from libnpmpack package - pack function type.
// The libnpmpack module exports a function directly as module.exports = pack
type LibnpmPack = (spec?: string, opts?: any) => Promise<Buffer>

import libnpmpack from 'libnpmpack'

export default libnpmpack as LibnpmPack
