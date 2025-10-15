import { createServer } from 'node:http'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { httpRequest } from '../../registry/dist/lib/http-request.js'

import type { IncomingMessage, ServerResponse } from 'node:http'

describe('httpRequest', () => {
  let server: ReturnType<typeof createServer>
  let baseUrl: string

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || '/'

      if (url === '/success') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'success' }))
      } else if (url === '/redirect') {
        res.writeHead(301, { Location: '/success' })
        res.end()
      } else if (url === '/error') {
        res.writeHead(500, 'Internal Server Error')
        res.end('Server error')
      } else if (url === '/not-found') {
        res.writeHead(404, 'Not Found')
        res.end('Not found')
      } else if (url === '/with-headers') {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'X-Custom-Header': 'custom-value',
        })
        res.end('Response with headers')
      } else if (url === '/timeout') {
        // Intentionally do not respond to simulate timeout.
        // The request will be aborted by the client timeout.
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const address = server.address()
        const port =
          typeof address === 'object' && address !== null
            ? address.port
            : undefined
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(() => {
        resolve()
      })
    })
  })

  it('should make a successful GET request', async () => {
    const response = await httpRequest(`${baseUrl}/success`)
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body.toString()).toContain('success')
  })

  it('should handle 404 responses', async () => {
    const response = await httpRequest(`${baseUrl}/not-found`)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
    expect(response.statusText).toBe('Not Found')
  })

  it('should handle 500 responses', async () => {
    const response = await httpRequest(`${baseUrl}/error`)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
    expect(response.statusText).toBe('Internal Server Error')
  })

  it('should include response headers', async () => {
    const response = await httpRequest(`${baseUrl}/with-headers`)
    expect(response.headers['content-type']).toBe('text/plain')
    expect(response.headers['x-custom-header']).toBe('custom-value')
  })

  it('should support custom headers', async () => {
    const response = await httpRequest(`${baseUrl}/success`, {
      headers: { 'User-Agent': 'test-agent' },
    })
    expect(response.ok).toBe(true)
  })

  it('should support custom method', async () => {
    const response = await httpRequest(`${baseUrl}/success`, {
      method: 'GET',
    })
    expect(response.ok).toBe(true)
  })

  it('should handle timeout', async () => {
    await expect(
      httpRequest(`${baseUrl}/timeout`, { timeout: 50 }),
    ).rejects.toThrow('Request timed out after 50ms')
  })

  it('should handle invalid URL', async () => {
    await expect(httpRequest('not-a-valid-url')).rejects.toThrow()
  })

  it('should handle connection errors', async () => {
    await expect(httpRequest('http://127.0.0.1:99999/test')).rejects.toThrow()
  })

  it('should follow redirects', async () => {
    const response = await httpRequest(`${baseUrl}/redirect`)
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.body.toString()).toContain('success')
  })

  it('should handle redirects with followRedirects: false', async () => {
    const response = await httpRequest(`${baseUrl}/redirect`, {
      followRedirects: false,
    })
    expect(response.status).toBe(301)
  })

  it('should use json() method', async () => {
    const response = await httpRequest(`${baseUrl}/success`)
    const json = response.json<{ message: string }>()
    expect(json.message).toBe('success')
  })

  it('should use text() method', async () => {
    const response = await httpRequest(`${baseUrl}/with-headers`)
    const text = response.text()
    expect(text).toBe('Response with headers')
  })

  it('should use arrayBuffer() method', async () => {
    const response = await httpRequest(`${baseUrl}/success`)
    const buffer = response.arrayBuffer()
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('should retry on failure', async () => {
    let attempts = 0
    const testServer = createServer((_req, res) => {
      attempts += 1
      if (attempts < 3) {
        res.destroy()
      } else {
        res.writeHead(200)
        res.end('success after retries')
      }
    })

    await new Promise<void>(resolve => {
      testServer.listen(0, () => resolve())
    })

    const address = testServer.address()
    const port =
      typeof address === 'object' && address !== null ? address.port : 0

    const response = await httpRequest(`http://127.0.0.1:${port}/test`, {
      retries: 3,
      retryDelay: 10,
    })

    expect(response.ok).toBe(true)
    expect(attempts).toBe(3)

    await new Promise<void>(resolve => {
      testServer.close(() => resolve())
    })
  })

  it('should handle POST with body', async () => {
    const testServer = createServer((req, res) => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        res.writeHead(200)
        res.end(body)
      })
    })

    await new Promise<void>(resolve => {
      testServer.listen(0, () => resolve())
    })

    const address = testServer.address()
    const port =
      typeof address === 'object' && address !== null ? address.port : 0

    const response = await httpRequest(`http://127.0.0.1:${port}/test`, {
      body: 'test body',
      method: 'POST',
    })

    expect(response.ok).toBe(true)
    expect(response.text()).toBe('test body')

    await new Promise<void>(resolve => {
      testServer.close(() => resolve())
    })
  })
})
