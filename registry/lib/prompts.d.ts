import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import search from '@inquirer/search'
import select from '@inquirer/select'

declare const promptsModule: {
  confirm: typeof confirm
  input: typeof input
  search: typeof search
  select: typeof select
}
export = promptsModule
