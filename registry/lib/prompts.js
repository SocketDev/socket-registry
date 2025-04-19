'use strict'

const {
  Separator,
  default: selectRaw
} = /*@__PURE__*/ require('../external/@inquirer/select')

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
    } catch (e) {
      if (e instanceof TypeError) {
        throw e
      }
    }
    if (isSpinning) {
      spinner?.start()
    }
    return result
  }
}

const confirm = /*@__PURE__*/ wrapPrompt(
  require('../external/@inquirer/confirm')
)
const input = /*@__PURE__*/ wrapPrompt(require('../external/@inquirer/input'))
const password = /*@__PURE__*/ wrapPrompt(
  require('../external/@inquirer/password')
)
const search = /*@__PURE__*/ wrapPrompt(
  require('../external/@inquirer/search').default
)
const select = /*@__PURE__*/ wrapPrompt(selectRaw)

module.exports = {
  Separator,
  confirm,
  input,
  password,
  search,
  select
}
