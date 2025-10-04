import { describe, expect, it } from 'vitest'

describe('IPC functionality', () => {
  describe('getIpc', () => {
    it('should return full IPC data when key is undefined', async () => {
      const getIpc = (await import('../../registry/src/lib/constants/get-ipc'))
        .default
      const data = await getIpc(undefined)
      expect(data).toBeDefined()
    })

    it('should return specific key from IPC data', async () => {
      const getIpc = (await import('../../registry/src/lib/constants/get-ipc'))
        .default
      const ipcPromise = import(
        '../../registry/src/lib/constants/ipc-promise'
      ).then(m => m.default)
      const fullData = await ipcPromise
      const specificData = await getIpc('execPath')
      if ('execPath' in (fullData as any)) {
        expect(specificData).toBe((fullData as any)['execPath'])
      } else {
        expect(specificData).toBeUndefined()
      }
    })
  })
})
