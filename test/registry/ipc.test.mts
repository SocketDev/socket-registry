import { describe, expect, it } from 'vitest'

describe('IPC functionality', () => {
  describe('getIpc', () => {
    it('should return full IPC data when key is undefined', async () => {
      const getIpc = (await import('@socketsecurity/lib/utils/get-ipc')).default
      const data = await getIpc()
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
    })

    it('should return specific key from IPC data', async () => {
      const getIpc = (await import('@socketsecurity/lib/utils/get-ipc')).default
      const fullData = await getIpc()
      const specificData = await getIpc('SOCKET_CLI_FIX')
      if ('SOCKET_CLI_FIX' in fullData) {
        expect(specificData).toBe(fullData.SOCKET_CLI_FIX)
      } else {
        expect(specificData).toBeUndefined()
      }
    })
  })
})
