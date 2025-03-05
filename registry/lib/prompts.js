'use strict'

const {
  Separator,
  default: selectRaw
} = /*@__PURE__*/ require('@inquirer/select')

const constants = /*@__PURE__*/ require('./constants')

const { abortSignal } = constants

/*@__NO_SIDE_EFFECTS__*/
function wrapPrompt(inquirerPrompt) {
  return async (...args) => {
    const origContext = args.length > 1 ? args[1] : undefined
    const {
      // Lazily access constants.spinner.
      spinner = constants.spinner,
      ...contextWithoutSpinner
    } = origContext ?? {}
    if (origContext) {
      args[1] = {
        signal: abortSignal,
        ...contextWithoutSpinner
      }
    } else {
      args[1] = { signal: abortSignal }
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

const confirm = /*@__PURE__*/ wrapPrompt(require('@inquirer/confirm').default)
const input = /*@__PURE__*/ wrapPrompt(require('@inquirer/input').default)
const password = /*@__PURE__*/ wrapPrompt(require('@inquirer/password').default)
const search = /*@__PURE__*/ wrapPrompt(require('@inquirer/search').default)
const select = /*@__PURE__*/ wrapPrompt(selectRaw)

module.exports = {
  Separator,
  confirm,
  input,
  password,
  search,
  select
}
