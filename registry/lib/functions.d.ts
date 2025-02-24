declare type AsyncFunction<TArgs extends any[], TResult> = (
  ...args: TArgs
) => Promise<TResult>
declare const Functions: {
  silentWrapAsync<TArgs extends any[], TResult>(
    fn: AsyncFunction<TArgs, TResult>
  ): (...args: TArgs) => Promise<TResult | undefined>
}
declare namespace Functions {
  export { AsyncFunction }
}
export = Functions
