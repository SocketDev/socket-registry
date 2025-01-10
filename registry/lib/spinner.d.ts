import { Options, Spinner } from '@socketregistry/yocto-spinner'

declare const spinnerModule: {
  Spinner: {
    new (options?: Options): Spinner
    (options?: Options): Spinner
  } & Spinner
}
export = spinnerModule
