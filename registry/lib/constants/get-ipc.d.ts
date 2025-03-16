import IPC from './ipc'

declare function getIpc(): Promise<IPC>
declare function getIpc<K extends keyof IPC | undefined>(
  key?: K | undefined
): Promise<K extends keyof IPC ? IPC[K] : IPC>
export = getIpc
