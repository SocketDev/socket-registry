const { atob: builtinAtob, btoa: builtinBtoa } = globalThis

function atobFn(...args) {
  try {
    return builtinAtob(...args)
  } catch (e) {
    if (e?.name === 'InvalidCharacterError' && e instanceof DOMException) {
      return null
    }
    throw e
  }
}

function btoaFn(...args) {
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
  btoa: btoaFn,
}
