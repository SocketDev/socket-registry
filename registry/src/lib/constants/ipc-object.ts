import handler from './ipc-handler'
import target from './ipc-target'

// Note: IpcObject type is defined in ipc-object.d.ts
const ipcObject = new Proxy(target, handler)

export default ipcObject
