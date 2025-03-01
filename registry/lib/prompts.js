'use strict'

const { Separator, default: selectRaw } = require('@inquirer/select')

function wrapPrompt(inquirerPrompt) {
  return async (...args) => {
    const origContext = args.length > 1 ? args[1] : undefined
    const { spinner, ...contextWithoutSpinner } = origContext ?? {}
    if (origContext) {
      args[1] = contextWithoutSpinner
    }
    const isSpinning = spinner?.isSpinning ?? false
    spinner?.stop()
    let result
    try {
      result = await inquirerPrompt(...args)
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
