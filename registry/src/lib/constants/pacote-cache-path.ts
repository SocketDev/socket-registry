import pacote from '../../external/pacote'

const proto = Reflect.getPrototypeOf(
  (pacote as any).RegistryFetcher.prototype,
) as any
const PacoteFetcherBase = proto?.constructor

export default new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
