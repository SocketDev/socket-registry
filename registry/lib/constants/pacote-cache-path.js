'use strict'

const pacote = /*@__PURE__*/ require('pacote')

const { constructor: PacoteFetcherBase } = Reflect.getPrototypeOf(
  pacote.RegistryFetcher.prototype
)

module.export = new PacoteFetcherBase(/*dummy package spec*/ 'x', {}).cache
