'use strict'

const { Separator, default: selectRaw } = require('@inquirer/select')

function wrapPrompt(fn) {
  return async (...args) => {
    const { length } = args
    const { spinner, ...config } = length ? args[0] : {}
    if (length) {
      args[0] = config
    }
    const isSpinning = spinner?.isSpinning ?? false
    spinner?.stop()
    let result
    try {
      result = await fn(...args)
    } catch {}
    if (isSpinning) {
      spinner?.start()
    }
    return result
  }
}

const confirm = wrapPrompt(require('@inquirer/confirm').default)
const input = wrapPrompt(require('@inquirer/input').default)
const password = wrapPrompt(require('@inquirer/password').default)
const search = wrapPrompt(require('@inquirer/search').default)
const select = wrapPrompt(selectRaw)

module.exports = {
  Separator,
  confirm,
  input,
  password,
  search,
  select
}
