import type { Page } from 'playwright-core'

export interface SettingsProbe {
  body: string
  fetchUrl: string
  status: number
}

export async function fetchJsonInPage(
  page: Page,
  url: string,
): Promise<SettingsProbe> {
  try {
    return await page.evaluate(async fetchUrl => {
      // oxlint-disable-next-line socket/no-fetch-prefer-http-request -- runs in the page with its cookies; Node HTTP cannot authenticate this request.
      const r = await fetch(fetchUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'x-spiferack': '1' },
        method: 'GET',
      })
      return {
        __proto__: null,
        body: await r.text(),
        fetchUrl: r.url,
        status: r.status,
      }
    }, url)
  } catch {
    return { body: '', fetchUrl: '', status: 0 }
  }
}
