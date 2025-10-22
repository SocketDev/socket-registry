# HTTP Utilities

Socket Registry provides enhanced HTTP request utilities built on Node.js native `http` and `https` modules with retry logic, redirect support, and download locking.

## Features

- **Automatic retries** with exponential backoff
- **Redirect following** (up to configurable max redirects)
- **Download locking** to prevent concurrent downloads
- **Progress callbacks** for file downloads
- **Streaming downloads** to avoid memory issues
- **Fetch-like API** using native Node.js modules

## Modules

### `@socketsecurity/registry/lib/http-request`

Core HTTP request utilities with retry logic and redirect support.

#### `httpRequest(url, options?): Promise<HttpResponse>`

Make an HTTP/HTTPS request with automatic retries and redirect support.

**Options:**
```typescript
interface HttpRequestOptions {
  body?: Buffer | string
  followRedirects?: boolean  // default: true
  headers?: Record<string, string>
  maxRedirects?: number      // default: 5
  method?: string            // default: 'GET'
  retries?: number           // default: 0
  retryDelay?: number        // default: 1000ms
  timeout?: number           // default: 30000ms
}
```

**Response:**
```typescript
interface HttpResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string | string[]>
  body: Buffer
  text(): string
  json<T>(): T
  arrayBuffer(): ArrayBuffer
}
```

**Example:**
```typescript
import { httpRequest } from '@socketsecurity/registry/lib/http-request'

const response = await httpRequest('https://api.example.com/data', {
  method: 'GET',
  retries: 3,          // Retry up to 3 times
  retryDelay: 1000,    // Start with 1s delay (1s, 2s, 4s)
  followRedirects: true,
  timeout: 30000,
})

if (response.ok) {
  const data = response.json()
  console.log(data)
}
```

#### `httpDownload(url, destPath, options?): Promise<HttpDownloadResult>`

Download a file to disk with streaming, retry logic, and progress callbacks.

**Options:**
```typescript
interface HttpDownloadOptions {
  headers?: Record<string, string>
  onProgress?: (downloaded: number, total: number) => void
  retries?: number           // default: 0
  retryDelay?: number        // default: 1000ms
  timeout?: number           // default: 120000ms (2 minutes)
}
```

**Result:**
```typescript
interface HttpDownloadResult {
  path: string
  size: number
}
```

**Example:**
```typescript
import { httpDownload } from '@socketsecurity/registry/lib/http-request'

const result = await httpDownload(
  'https://example.com/file.tar.gz',
  '/tmp/downloads/file.tar.gz',
  {
    retries: 3,
    onProgress: (downloaded, total) => {
      const percent = Math.floor((downloaded / total) * 100)
      console.log(`Progress: ${percent}% (${downloaded} / ${total} bytes)`)
    },
  },
)

console.log(`Downloaded ${result.size} bytes to ${result.path}`)
```

#### `httpGetJson<T>(url, options?): Promise<T>`

GET request with automatic JSON parsing.

**Example:**
```typescript
import { httpGetJson } from '@socketsecurity/registry/lib/http-request'

interface Release {
  tag_name: string
  assets: Array<{ name: string; browser_download_url: string }>
}

const release = await httpGetJson<Release>(
  'https://api.github.com/repos/owner/repo/releases/latest',
  { retries: 2 },
)

console.log(`Latest release: ${release.tag_name}`)
```

#### `httpGetText(url, options?): Promise<string>`

GET request returning plain text.

**Example:**
```typescript
import { httpGetText } from '@socketsecurity/registry/lib/http-request'

const readme = await httpGetText(
  'https://raw.githubusercontent.com/owner/repo/main/README.md',
)

console.log(readme)
```

### `@socketsecurity/registry/lib/download-lock`

Download locking to prevent concurrent downloads of the same resource across processes.

#### `downloadWithLock(url, destPath, options?): Promise<HttpDownloadResult>`

Download with file-based locking to prevent race conditions when multiple processes try to download the same file.

**Options:**
```typescript
interface DownloadWithLockOptions extends HttpDownloadOptions {
  lockTimeout?: number    // default: 60000ms (1 minute)
  locksDir?: string       // default: '<destPath>/.locks'
  pollInterval?: number   // default: 1000ms
  staleTimeout?: number   // default: 300000ms (5 minutes)
}
```

**Features:**
- **Cross-process locking**: Uses file-based locks visible to all processes
- **Stale lock detection**: Automatically removes locks from dead processes
- **Smart caching**: Returns immediately if file already exists
- **Atomic operations**: Uses exclusive file creation flags

**Example:**
```typescript
import { downloadWithLock } from '@socketsecurity/registry/lib/download-lock'

// Multiple processes can call this simultaneously - only one will download
const result = await downloadWithLock(
  'https://example.com/large-binary.tar.gz',
  '/tmp/cache/large-binary.tar.gz',
  {
    retries: 3,
    lockTimeout: 60000,  // Wait up to 1 minute for other downloads
    onProgress: (downloaded, total) => {
      console.log(`${Math.floor((downloaded / total) * 100)}%`)
    },
  },
)

// File is now available at result.path
```

**Lock Behavior:**
1. If file exists → return immediately
2. If lock exists and valid → wait for download to complete
3. If lock is stale → remove and acquire
4. If lock acquired → download file → release lock
5. If timeout → throw error

## Architecture

### Retry Logic

All HTTP functions use exponential backoff for retries:

```typescript
// Retry delays with retries=3, retryDelay=1000:
Attempt 1: 0ms (immediate)
Attempt 2: 1000ms (1s)
Attempt 3: 2000ms (2s)
Attempt 4: 4000ms (4s)
```

### Redirect Following

Automatic redirect following with configurable limits:
- Supports both relative and absolute redirect URLs
- Prevents infinite redirect loops with `maxRedirects`
- Preserves headers and request options through redirects

### Download Locking

File-based locking mechanism:

```
<destPath>/.locks/
└── <sanitized-destPath>.lock  (JSON file)
    {
      "pid": 12345,
      "startTime": 1234567890,
      "url": "https://..."
    }
```

Lock files are checked for:
1. **Age**: Locks older than `staleTimeout` are removed
2. **Process**: Locks from non-existent processes are removed
3. **Validity**: Corrupted lock files are removed

## Error Handling

All functions throw errors with descriptive messages and cause chains:

```typescript
try {
  const response = await httpRequest('https://api.example.com/data')
} catch (error) {
  console.error(error.message)  // "HTTP request failed: ECONNREFUSED"
  console.error(error.cause)     // Original error object
}
```

Common error scenarios:
- **Network errors**: Connection refused, timeout, DNS failures
- **HTTP errors**: 4xx/5xx status codes
- **Lock errors**: Lock acquisition timeout, stale locks
- **Parse errors**: Invalid JSON responses

## Performance Considerations

### Memory

- Downloads use streaming (via `pipe()`) to avoid loading entire files in memory
- Response bodies are buffered only for `httpRequest()` calls
- Lock files are small JSON (<1KB)

### Concurrency

- Locks are per-destination-path, not per-URL
- Multiple different downloads can proceed in parallel
- Same destination path downloads are serialized

### Caching

The utilities don't implement caching themselves. For API response caching, use `@socketsecurity/registry/lib/cacache`:

```typescript
import { safeGet, put } from '@socketsecurity/registry/lib/cacache'
import { httpGetJson } from '@socketsecurity/registry/lib/http-request'

const cacheKey = `github:api:${url}`
const cached = await safeGet(cacheKey)

if (cached) {
  return JSON.parse(cached.data.toString())
}

const data = await httpGetJson(url, { retries: 2 })
await put(cacheKey, JSON.stringify(data), { metadata: { timestamp: Date.now() } })

return data
```

## Migration from fetch()

Migrating from `fetch()` to these utilities:

**Before (fetch):**
```typescript
const response = await fetch(url, {
  method: 'GET',
  headers: { 'User-Agent': 'my-app' },
})

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`)
}

const data = await response.json()
```

**After (http-request):**
```typescript
const data = await httpGetJson(url, {
  headers: { 'User-Agent': 'my-app' },
  retries: 3,  // Automatic retries!
})
```

## Testing

Mock HTTP requests in tests using Vitest:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:http', () => ({
  default: {
    request: vi.fn(),
  },
}))

describe('httpRequest', () => {
  it('should make successful requests', async () => {
    // Your test implementation
  })
})
```

See `test/registry/http-request.test.mts` for full examples.

## See Also

- **`@socketsecurity/registry/lib/cacache`**: Content-addressable cache for responses
- **`@socketsecurity/registry/lib/agent`**: HTTP/HTTPS agent configuration
- **Socket CLI HTTP utilities**: `src/utils/http.mts` in socket-cli repo
