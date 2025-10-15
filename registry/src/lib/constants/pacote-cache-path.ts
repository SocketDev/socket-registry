/**
 * @fileoverview File system path to the pacote cache directory.
 */

import pacote from '../../external/pacote'
import { normalizePath } from '../path'

const proto = Reflect.getPrototypeOf(
  (pacote as { RegistryFetcher: { prototype: object } }).RegistryFetcher
    .prototype,
) as { constructor?: new (...args: unknown[]) => { cache: string } }
const PacoteFetcherBase = proto?.constructor

const cachePath = PacoteFetcherBase
  ? new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
  : ''

export default normalizePath(cachePath)
