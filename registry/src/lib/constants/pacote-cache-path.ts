import pacote from '../../external/pacote'
import { normalizePath } from '../path'

const proto = Reflect.getPrototypeOf(
  (pacote as any).RegistryFetcher.prototype,
) as any
const PacoteFetcherBase = proto?.constructor

const cachePath = new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache

export default normalizePath(cachePath)
