import type { Remap } from './objects'
import type { Spinner } from './spinner'
import type inquirerConfirm from '@inquirer/confirm'
import type inquirerInput from '@inquirer/input'
import type inquirerPassword from '@inquirer/password'
import type inquirerSearch from '@inquirer/search'
import type inquirerSelect from '@inquirer/select'
import type { Separator as InquirerSeparator } from '@inquirer/select'
import type { Context as InquirerContext } from '@inquirer/type'

declare type Choice<Value> = {
  value: Value
  disabled?: boolean | string | undefined
  description?: string | undefined
  name?: string | undefined
  short?: string
  type?: never
}
declare type Context = Remap<
  InquirerContext & { spinner?: Spinner | undefined }
>
declare type Separator = InquirerSeparator
declare const Prompts: {
  Separator: typeof InquirerSeparator
  confirm: (
    config: Parameters<typeof inquirerConfirm>[0],
    context?: Context | undefined
  ) => ReturnType<typeof inquirerConfirm>
  input: (
    config: Parameters<typeof inquirerInput>[0],
    context?: Context | undefined
  ) => ReturnType<typeof inquirerInput>
  password: (
    config: Parameters<typeof inquirerPassword>[0],
    context?: Context | undefined
  ) => ReturnType<typeof inquirerPassword>
  search: <Value>(
    config: Parameters<typeof inquirerSearch<Value>>[0],
    context?: Context | undefined
  ) => ReturnType<typeof inquirerSearch<Value>>
  select: <Value>(
    config: Omit<Parameters<typeof inquirerSelect<Value>>[0], 'choices'> & {
      choices:
        | Array<string | Separator>
        | Array<Separator | Choice<Value>>
        | ReadonlyArray<string | Separator>
        | ReadonlyArray<Separator | Choice<Value>>
    },
    context?: Context | undefined
  ) => ReturnType<typeof inquirerSelect<Value>>
}
declare namespace Prompts {
  export { Choice, Context, Separator }
}
export = Prompts
