/** @fileoverview HTTP/HTTPS request utilities using Node.js built-in modules with retry logic, redirects, and download support. */

import { createWriteStream } from 'node:fs'
import http from 'node:http'
import https from 'node:https'

import type { IncomingMessage } from 'node:http'

export interface HttpRequestOptions {
  body?: Buffer | string | undefined
  followRedirects?: boolean | undefined
  headers?: Record<string, string> | undefined
  maxRedirects?: number | undefined
  method?: string | undefined
  retries?: number | undefined
  retryDelay?: number | undefined
  timeout?: number | undefined
}

export interface HttpResponse {
  arrayBuffer(): ArrayBuffer
  body: Buffer
  headers: Record<string, string | string[] | undefined>
  json<T = unknown>(): T
  ok: boolean
  status: number
  statusText: string
  text(): string
}

export interface HttpDownloadOptions {
  headers?: Record<string, string> | undefined
  onProgress?: ((downloaded: number, total: number) => void) | undefined
  retries?: number | undefined
  retryDelay?: number | undefined
  timeout?: number | undefined
}

export interface HttpDownloadResult {
  path: string
  size: number
}

/**
 * Make an HTTP/HTTPS request with retry logic and redirect support.
 * Provides a fetch-like API using Node.js native http/https modules.
 * @throws {Error} When all retries are exhausted or non-retryable error occurs.
 */
export async function httpRequest(
  url: string,
  options?: HttpRequestOptions | undefined,
): Promise<HttpResponse> {
  const {
    body,
    followRedirects = true,
    headers = {},
    maxRedirects = 5,
    method = 'GET',
    retries = 0,
    retryDelay = 1000,
    timeout = 30000,
  } = { __proto__: null, ...options } as HttpRequestOptions

  // Retry logic with exponential backoff
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await httpRequestAttempt(url, {
        body,
        followRedirects,
        headers,
        maxRedirects,
        method,
        timeout,
      })
    } catch (e) {
      lastError = e as Error

      // Last attempt - throw error
      if (attempt === retries) {
        break
      }

      // Retry with exponential backoff
      const delayMs = retryDelay * Math.pow(2, attempt)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Single HTTP request attempt (used internally by httpRequest with retry logic).
 */
async function httpRequestAttempt(
  url: string,
  options: HttpRequestOptions,
): Promise<HttpResponse> {
  const {
    body,
    followRedirects = true,
    headers = {},
    maxRedirects = 5,
    method = 'GET',
    timeout = 30000,
  } = { __proto__: null, ...options } as HttpRequestOptions

  return await new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    const httpModule = isHttps ? https : http

    const requestOptions = {
      headers: {
        'User-Agent': 'socket-registry/1.0',
        ...headers,
      },
      hostname: parsedUrl.hostname,
      method,
      path: parsedUrl.pathname + parsedUrl.search,
      port: parsedUrl.port,
      timeout,
    }

    const request = httpModule.request(
      requestOptions,
      (res: IncomingMessage) => {
        // Handle redirects
        if (
          followRedirects &&
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) {
            reject(
              new Error(
                `Too many redirects (exceeded maximum: ${maxRedirects})`,
              ),
            )
            return
          }

          // Follow redirect
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString()

          resolve(
            httpRequestAttempt(redirectUrl, {
              body,
              followRedirects,
              headers,
              maxRedirects: maxRedirects - 1,
              method,
              timeout,
            }),
          )
          return
        }

        // Collect response data
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })

        res.on('end', () => {
          const responseBody = Buffer.concat(chunks)
          const ok =
            res.statusCode !== undefined &&
            res.statusCode >= 200 &&
            res.statusCode < 300

          const response: HttpResponse = {
            arrayBuffer(): ArrayBuffer {
              return responseBody.buffer.slice(
                responseBody.byteOffset,
                responseBody.byteOffset + responseBody.byteLength,
              )
            },
            body: responseBody,
            headers: res.headers as Record<
              string,
              string | string[] | undefined
            >,
            json<T = unknown>(): T {
              return JSON.parse(responseBody.toString('utf8')) as T
            },
            ok,
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            text(): string {
              return responseBody.toString('utf8')
            },
          }

          resolve(response)
        })
      },
    )

    request.on('error', (error: Error) => {
      const err = new Error(`HTTP request failed: ${error.message}`)
      ;(err as any).cause = error
      reject(err)
    })

    request.on('timeout', () => {
      request.destroy()
      reject(new Error(`Request timed out after ${timeout}ms`))
    })

    // Send body if present
    if (body) {
      request.write(body)
    }

    request.end()
  })
}

/**
 * Download a file from a URL to a local path with retry logic and progress callbacks.
 * Uses streaming to avoid loading entire file in memory.
 * @throws {Error} When all retries are exhausted or download fails.
 */
export async function httpDownload(
  url: string,
  destPath: string,
  options?: HttpDownloadOptions | undefined,
): Promise<HttpDownloadResult> {
  const {
    headers = {},
    onProgress,
    retries = 0,
    retryDelay = 1000,
    timeout = 120000,
  } = { __proto__: null, ...options } as HttpDownloadOptions

  // Retry logic with exponential backoff
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await httpDownloadAttempt(url, destPath, {
        headers,
        onProgress,
        timeout,
      })
    } catch (e) {
      lastError = e as Error

      // Last attempt - throw error
      if (attempt === retries) {
        break
      }

      // Retry with exponential backoff
      const delayMs = retryDelay * Math.pow(2, attempt)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error('Download failed after retries')
}

/**
 * Single download attempt (used internally by httpDownload with retry logic).
 */
async function httpDownloadAttempt(
  url: string,
  destPath: string,
  options: HttpDownloadOptions,
): Promise<HttpDownloadResult> {
  const {
    headers = {},
    onProgress,
    timeout = 120000,
  } = { __proto__: null, ...options } as HttpDownloadOptions

  return await new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    const httpModule = isHttps ? https : http

    const requestOptions = {
      headers: {
        'User-Agent': 'socket-registry/1.0',
        ...headers,
      },
      hostname: parsedUrl.hostname,
      method: 'GET',
      path: parsedUrl.pathname + parsedUrl.search,
      port: parsedUrl.port,
      timeout,
    }

    let fileStream: ReturnType<typeof createWriteStream> | undefined
    let streamClosed = false

    const closeStream = () => {
      if (!streamClosed && fileStream) {
        streamClosed = true
        fileStream.close()
      }
    }

    const request = httpModule.request(
      requestOptions,
      (res: IncomingMessage) => {
        // Check status code
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          closeStream()
          reject(
            new Error(
              `Download failed: HTTP ${res.statusCode} ${res.statusMessage}`,
            ),
          )
          return
        }

        const totalSize = parseInt(res.headers['content-length'] || '0', 10)
        let downloadedSize = 0

        // Create write stream
        fileStream = createWriteStream(destPath)

        fileStream.on('error', (error: Error) => {
          closeStream()
          const err = new Error(`Failed to write file: ${error.message}`)
          ;(err as any).cause = error
          reject(err)
        })

        res.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length
          if (onProgress && totalSize > 0) {
            onProgress(downloadedSize, totalSize)
          }
        })

        res.on('end', () => {
          fileStream!.close(() => {
            streamClosed = true
            resolve({
              path: destPath,
              size: downloadedSize,
            })
          })
        })

        res.on('error', (error: Error) => {
          closeStream()
          reject(error)
        })

        // Pipe response to file
        res.pipe(fileStream)
      },
    )

    request.on('error', (error: Error) => {
      closeStream()
      const err = new Error(`HTTP download failed: ${error.message}`)
      ;(err as any).cause = error
      reject(err)
    })

    request.on('timeout', () => {
      request.destroy()
      closeStream()
      reject(new Error(`Download timed out after ${timeout}ms`))
    })

    request.end()
  })
}

/**
 * Perform a GET request and parse JSON response.
 * @throws {Error} When request fails or JSON parsing fails.
 */
export async function httpGetJson<T = unknown>(
  url: string,
  options?: HttpRequestOptions | undefined,
): Promise<T> {
  const response = await httpRequest(url, { ...options, method: 'GET' })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  try {
    return response.json<T>()
  } catch (e) {
    const err = new Error('Failed to parse JSON response')
    ;(err as any).cause = e
    throw err
  }
}

/**
 * Perform a GET request and return text response.
 * @throws {Error} When request fails.
 */
export async function httpGetText(
  url: string,
  options?: HttpRequestOptions | undefined,
): Promise<string> {
  const response = await httpRequest(url, { ...options, method: 'GET' })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.text()
}
