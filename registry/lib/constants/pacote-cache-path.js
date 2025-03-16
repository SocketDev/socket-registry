'use strict'

const pacote = /*@__PURE__*/ require('pacote')

const { constructor: PacoteFetcherBase } = Reflect.getPrototypeOf(
  pacote.RegistryFetcher.prototype
)

module.exports = new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
