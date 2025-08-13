'use strict'

/*@__NO_SIDE_EFFECTS__*/
function wrapPrompt(inquirerPrompt) {
  return async (...args) => {
    const origContext = args.length > 1 ? args[1] : undefined
    const {
      spinner = /*@__PURE__*/ require('./constants/spinner'),
      ...contextWithoutSpinner
    } = origContext ?? {}
    const abortSignal = /*@__PURE__*/ require('./constants/abort-signal')
    if (origContext) {
      args[1] = {
        signal: abortSignal,
        ...contextWithoutSpinner
      }
    } else {
      args[1] = { signal: abortSignal }
    }
    const wasSpinning = !!spinner?.isSpinning
    spinner?.stop()
    let result
    try {
      result = await inquirerPrompt(...args)
    } catch (e) {
      if (e instanceof TypeError) {
        throw e
      }
    }
    if (wasSpinning) {
      spinner.start()
    }
    return typeof result === 'string' ? result.trim() : result
  }
}

const selectExport = /*@__PURE__*/ require('../external/@inquirer/select')
const selectRaw = selectExport.default
const Separator = selectExport.Separator

const confirmRaw = /*@__PURE__*/ require('../external/@inquirer/confirm')
const confirm = /*@__PURE__*/ wrapPrompt(confirmRaw)

const inputRaw = /*@__PURE__*/ require('../external/@inquirer/input')
const input = /*@__PURE__*/ wrapPrompt(inputRaw)

const passwordRaw = /*@__PURE__*/ require('../external/@inquirer/password')
const password = /*@__PURE__*/ wrapPrompt(passwordRaw)

const searchExport = /*@__PURE__*/ require('../external/@inquirer/search')
const searchRaw = searchExport.default

const search = /*@__PURE__*/ wrapPrompt(searchRaw)
const select = /*@__PURE__*/ wrapPrompt(selectRaw)

module.exports = {
  Separator,
  confirm,
  input,
  password,
  search,
  select
}
