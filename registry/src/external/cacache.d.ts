declare const cacache: {
  tmp: {
    withTmp: (
      cache: string,
      opts: any,
      callback: (tmpDirPath: string) => Promise<void>,
    ) => Promise<void>
  }
  [key: string]: any
}
export = cacache
