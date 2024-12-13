import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import password from '@inquirer/password'
import search from '@inquirer/search'
import select, { Separator } from '@inquirer/select'

declare global {
  type Separator = InstanceType<typeof Separator>
}
declare const promptsModule: {
  Separator: typeof Separator
  confirm: typeof confirm
  input: typeof input
  password: typeof password
  search: typeof search
  select: typeof select
}
export = promptsModule
