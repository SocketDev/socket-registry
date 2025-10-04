/** @fileoverview HTTP/HTTPS request utilities using Node.js built-in modules. */

import { get as httpGet } from 'node:http'
import { get as httpsGet } from 'node:https'

import type { IncomingMessage } from 'node:http'

export interface HttpRequestOptions {
  headers?: Record<string, string> | undefined
  method?: string | undefined
  timeout?: number | undefined
}

export interface HttpResponse {
  body: Buffer
  headers: Record<string, string | string[] | undefined>
  ok: boolean
  status: number
  statusText: string
}

/**
 * Make an HTTP/HTTPS GET request.
 * @throws {Error} When request fails or times out.
 */
export function httpRequest(
  url: string,
  options?: HttpRequestOptions | undefined,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const opts = { __proto__: null, ...options } as HttpRequestOptions
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    const get = isHttps ? httpsGet : httpGet

    const requestOptions = {
      headers: opts.headers || {},
      method: opts.method || 'GET',
      timeout: opts.timeout,
    }

    const request = get(url, requestOptions, (res: IncomingMessage) => {
      const { statusCode, statusMessage } = res
      const chunks: Buffer[] = []

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        const body = Buffer.concat(chunks)
        const headers: Record<string, string | string[] | undefined> =
          Object.create(null)
        for (const { 0: key, 1: value } of Object.entries(res.headers)) {
          headers[key] = value
        }

        resolve({
          body,
          headers,
          ok: statusCode !== undefined && statusCode >= 200 && statusCode < 300,
          status: statusCode || 0,
          statusText: statusMessage || '',
        })
      })
    })

    request.on('error', e => {
      reject(new Error(`HTTP request failed: ${e.message}`, { cause: e }))
    })

    if (opts.timeout) {
      request.on('timeout', () => {
        request.destroy()
        reject(new Error(`HTTP request timed out after ${opts.timeout}ms`))
      })
    }
  })
}
