import ipcPromise from './ipc-promise'

/*@__NO_SIDE_EFFECTS__*/
async function getIpc(key: string | undefined) {
  const data = await ipcPromise
  return key === undefined ? data : (data as any)[key]
}

export default getIpc
