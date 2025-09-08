import IpcObject from './ipc-object'

declare function getIpc(): Promise<typeof IpcObject>
declare function getIpc<K extends keyof IpcObject | undefined>(
  key?: K | undefined
): Promise<K extends keyof IpcObject ? IpcObject[K] : typeof IpcObject>
export = getIpc
