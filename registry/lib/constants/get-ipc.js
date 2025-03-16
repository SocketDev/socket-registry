'use strict'

/*@__NO_SIDE_EFFECTS__*/
async function getIpc(key) {
  const ipcPromise = /*@__PURE__*/ require('./ipc-promise')
  const data = await ipcPromise
  return key === undefined ? data : data[key]
}

module.exports = getIpc
