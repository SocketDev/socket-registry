'use strict'

const { silentWrapAsync } = require('./functions')

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
