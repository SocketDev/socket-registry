'use strict'

const {
  Separator,
  default: selectRaw
} = /*@__PURE__*/ require('@inquirer/select')

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
    const isSpinning = !!spinner?.isSpinning
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
