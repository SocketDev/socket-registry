const { atob: builtinAtob, btoa: builtinBtoa } = globalThis

const atobFn = function atob(...args) {
  try {
    return builtinAtob(...args)
  } catch (e) {
    if (e?.name === 'InvalidCharacterError' && e instanceof DOMException) {
      return null
    }
    throw e
  }
}

const btoaFn = function btoa(...args) {
  try {
    return builtinBtoa(...args)
  } catch (e) {
    if (e?.name === 'InvalidCharacterError' && e instanceof DOMException) {
      return null
    }
    throw e
  }
}

module.exports = {
  atob: atobFn,
  btoa: btoaFn
}
