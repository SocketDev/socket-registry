import inquirerConfirm from '@inquirer/confirm'
import inquirerInput from '@inquirer/input'
import inquirerPassword from '@inquirer/password'
import inquirerSearch from '@inquirer/search'
import inquirerSelect, {
  Separator as InquirerSeparator
} from '@inquirer/select'
import { Remap } from './objects'
import { Spinner } from './spinner'

declare type OptionalSpinner = { spinner?: Spinner | undefined }
declare type Separator = InquirerSeparator
declare const Prompts: {
  Separator: typeof InquirerSeparator
  confirm: (
    config: Remap<Parameters<typeof inquirerConfirm>[0] & OptionalSpinner>
  ) => ReturnType<typeof inquirerConfirm>
  input: (
    config: Remap<Parameters<typeof inquirerInput>[0] & OptionalSpinner>
  ) => ReturnType<typeof inquirerInput>
  password: (
    config: Remap<Parameters<typeof inquirerPassword>[0] & OptionalSpinner>
  ) => ReturnType<typeof inquirerPassword>
  search: (
    config: Remap<Parameters<typeof inquirerSearch>[0] & OptionalSpinner>
  ) => ReturnType<typeof inquirerSearch>
  select: (
    config: Remap<Parameters<typeof inquirerSelect>[0] & OptionalSpinner>
  ) => ReturnType<typeof inquirerSelect>
}
declare namespace Prompts {
  export { Separator }
}
export = Prompts
