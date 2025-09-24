/// <reference types="node" />
declare type OnExitOptions = {
  alwaysLast?: boolean | undefined
}
declare const SignalExit: {
  onExit: (
    callback: (code: number | null, signal: NodeJS.Signals | null) => void,
    options?: OnExitOptions,
  ) => () => void
  load: () => void
  unload: () => void
  signals: () => NodeJS.Signals[]
}
declare namespace SignalExit {
  export { OnExitOptions }
}
export = SignalExit
