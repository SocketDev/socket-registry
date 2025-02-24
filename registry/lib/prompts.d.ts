import inquirerConfirm from '@inquirer/confirm'
import inquirerInput from '@inquirer/input'
import inquirerPassword from '@inquirer/password'
import inquirerSearch from '@inquirer/search'
import inquirerSelect, {
  Separator as InquirerSeparator
} from '@inquirer/select'

declare type Separator = InquirerSeparator
declare const Prompts: {
  Separator: typeof InquirerSeparator
  confirm: typeof inquirerConfirm
  input: typeof inquirerInput
  password: typeof inquirerPassword
  search: typeof inquirerSearch
  select: typeof inquirerSelect
}
declare namespace Prompts {
  export { Separator }
}
export = Prompts
