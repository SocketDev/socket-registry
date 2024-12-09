declare type AsyncFunction<TArgs extends any[], TResult> = (
  ...args: TArgs
) => Promise<TResult>
declare function silentWrapAsync<TArgs extends any[], TResult>(
  fn: AsyncFunction<TArgs, TResult>
): (...args: TArgs) => Promise<TResult | undefined>
declare const functionsModule: {
  silentWrapAsync: typeof silentWrapAsync
}
export = functionsModule
