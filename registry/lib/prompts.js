'use strict'

const { Separator, default: selectRaw } = require('@inquirer/select')

const { silentWrapAsync } = require('./functions')

const confirm = silentWrapAsync(require('@inquirer/confirm').default)
const input = silentWrapAsync(require('@inquirer/input').default)
const password = silentWrapAsync(require('@inquirer/password').default)
const search = silentWrapAsync(require('@inquirer/search').default)
const select = silentWrapAsync(selectRaw)

module.exports = {
  Separator,
  confirm,
  input,
  password,
  search,
  select
}
