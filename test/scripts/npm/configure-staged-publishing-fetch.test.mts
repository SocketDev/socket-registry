import type { Page } from 'playwright-core'
import { afterEach, expect, it, vi } from 'vitest'
import { fetchJsonInPage } from '../../../scripts/repo/npm/configure-staged-publishing-fetch.mts'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('reads the authenticated response and its final URL inside the page', async () => {
  const fetchResponse = vi.fn().mockResolvedValue({
    text: async () => '{"context":{}}',
    url: 'https://www.npmjs.com/login',
    status: 200,
  })
  vi.stubGlobal('fetch', fetchResponse)
  const page = {
    evaluate: async (read: (url: string) => Promise<unknown>, url: string) =>
      await read(url),
  } as unknown as Page
  const url = 'https://www.npmjs.com/package/example-package/access'

  expect(await fetchJsonInPage(page, url)).toEqual({
    body: '{"context":{}}',
    fetchUrl: 'https://www.npmjs.com/login',
    status: 200,
  })
  expect(fetchResponse).toHaveBeenCalledExactlyOnceWith(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'x-spiferack': '1' },
    method: 'GET',
  })
})

it('returns an unsettled probe when the page context cannot evaluate', async () => {
  const page = {
    evaluate: vi.fn().mockRejectedValue(new Error('context unavailable')),
  } as unknown as Page

  expect(await fetchJsonInPage(page, 'https://www.npmjs.com')).toEqual({
    body: '',
    fetchUrl: '',
    status: 0,
  })
})
