'use strict'

const pacote = /*@__PURE__*/ require('../../external/pacote')

const { constructor: PacoteFetcherBase } = Reflect.getPrototypeOf(
  pacote.RegistryFetcher.prototype
)

module.exports = new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
