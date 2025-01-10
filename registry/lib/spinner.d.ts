import {
  Options as YoctoOptions,
  Spinner as YoctoSpinner
} from '@socketregistry/yocto-spinner'

declare const spinnerModule: {
  Spinner: {
    new (options?: YoctoOptions): YoctoSpinner
    (options?: YoctoOptions): YoctoSpinner
  } & YoctoSpinner
}
declare namespace spinnerModule {
  export type Options = YoctoOptions
  export type Spinner = YoctoSpinner
}
export = spinnerModule
