import inquirerConfirm from '@inquirer/confirm'
import inquirerInput from '@inquirer/input'
import inquirerPassword from '@inquirer/password'
import inquirerSearch from '@inquirer/search'
import inquirerSelect, { Separator as InquirerSeparator } from '@inquirer/select'

declare namespace Prompts {
  export type Separator = typeof InquirerSeparator
  export const Separator: Separator
  export const confirm: typeof inquirerConfirm
  export const input: typeof inquirerInput
  export const password: typeof inquirerPassword
  export const search: typeof inquirerSearch
  export const select: typeof inquirerSelect
}
export = Prompts
