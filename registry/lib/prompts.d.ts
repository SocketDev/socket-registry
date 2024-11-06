declare const confirm: (...args: any[]) => Promise<boolean | undefined>
declare const input: (...args: any[]) => Promise<string | undefined>
declare const search: (...args: any[]) => Promise<string | undefined>
declare const select: (...args: any[]) => Promise<string | undefined>
declare const promptsModule: {
  confirm: typeof confirm
  input: typeof input
  search: typeof search
  select: typeof select
}
export = promptsModule
