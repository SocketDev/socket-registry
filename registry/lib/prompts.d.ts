import inquirerConfirm from '@inquirer/confirm'
import inquirerInput from '@inquirer/input'
import inquirerPassword from '@inquirer/password'
import inquirerSearch from '@inquirer/search'
import inquirerSelect, {
  Separator as InquirerSeparator
} from '@inquirer/select'
import { Context } from '@inquirer/type'
import { Remap } from './objects'
import { Spinner } from './spinner'

declare type OptionalSpinner = { spinner?: Spinner | undefined }
declare type Separator = InquirerSeparator
declare const Prompts: {
  Separator: typeof InquirerSeparator
  confirm: (
    config: Remap<Parameters<typeof inquirerConfirm>[0] & OptionalSpinner>,
    context?: Context | undefined
  ) => ReturnType<typeof inquirerConfirm>
  input: (
    config: Remap<Parameters<typeof inquirerInput>[0] & OptionalSpinner>,
    context?: Context | undefined
  ) => ReturnType<typeof inquirerInput>
  password: (
    config: Remap<Parameters<typeof inquirerPassword>[0] & OptionalSpinner>,
    context?: Context | undefined
  ) => ReturnType<typeof inquirerPassword>
  search: <Value>(
    config: Remap<Parameters<typeof inquirerSearch>[0] & OptionalSpinner>,
    context?: Context | undefined
  ) => ReturnType<typeof inquirerSearch<Value>>
  select: <Value>(
    config: Remap<Parameters<typeof inquirerSelect>[0] & OptionalSpinner>,
    context?: Context | undefined
  ) => ReturnType<typeof inquirerSelect<Value>>
}
declare namespace Prompts {
  export { Separator }
}
export = Prompts
