import ipcObject from './ipc-object'

declare function getIpc(): Promise<typeof ipcObject>
declare function getIpc<K extends keyof ipcObject | undefined>(
  key?: K | undefined
): Promise<K extends keyof ipcObject ? ipcObject[K] : typeof ipcObject>
export = getIpc
