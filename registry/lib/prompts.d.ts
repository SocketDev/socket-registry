import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import password from '@inquirer/password'
import search from '@inquirer/search'
import select from '@inquirer/select'

declare const promptsModule: {
  confirm: typeof confirm
  input: typeof input
  password: typeof password
  search: typeof search
  select: typeof select
}
export = promptsModule
