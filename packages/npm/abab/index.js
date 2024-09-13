const { atob: builtinAtob, btoa: builtinBtoa } = globalThis

function atob(...args) {
  try {
    return builtinAtob(...args)
  } catch (e) {
    if (e?.name === 'InvalidCharacterError' && e instanceof DOMException) {
      return null
    }
    throw e
  }
}

function btoa(...args) {
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
  atob,
  btoa
}
