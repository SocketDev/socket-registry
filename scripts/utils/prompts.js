'use strict'

function silentWrapAsync(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch {}
    return undefined
  }
}

const confirm = silentWrapAsync(require('@inquirer/confirm').default)
const input = silentWrapAsync(require('@inquirer/input').default)
const search = silentWrapAsync(require('@inquirer/search').default)
const select = silentWrapAsync(require('@inquirer/select').default)

module.exports = {
  confirm,
  input,
  search,
  select
}
