import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { deleteAsync as del } from 'del'
import { describe, expect, it } from 'vitest'

import { runInSubprocess } from '../utils/subprocess.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const cacacheImport = `import * as cacache from '${pathToFileURL(path.join(__dirname, '../../registry/dist/lib/cacache.js')).href}';`

describe('cacache module', () => {
  const TEST_KEY = 'test-cacache-key'
  const TEST_DATA = 'test data content'
  let testCacheDir: string

  it('should store and retrieve data from cache', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const TEST_KEY = '${TEST_KEY}';
const TEST_DATA = '${TEST_DATA}';

await cacache.put(TEST_KEY, TEST_DATA);
const entry = await cacache.get(TEST_KEY);

console.log(JSON.stringify({
  success: true,
  data: entry.data.toString(),
  integrity: entry.integrity,
  size: entry.size
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.data).toBe(TEST_DATA)
    expect(parsed.integrity).toBeTruthy()
    expect(parsed.size).toBe(TEST_DATA.length)

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should support Buffer data', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const TEST_KEY = '${TEST_KEY}';
const TEST_DATA = '${TEST_DATA}';

const buffer = Buffer.from(TEST_DATA);
await cacache.put(TEST_KEY, buffer);
const entry = await cacache.get(TEST_KEY);

console.log(JSON.stringify({
  success: true,
  data: entry.data.toString()
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.data).toBe(TEST_DATA)

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should throw when getting non-existent key', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

try {
  await cacache.get('non-existent-key');
  console.log(JSON.stringify({ success: false, error: 'Should have thrown' }));
} catch (e) {
  console.log(JSON.stringify({ success: true, error: e.message }));
}
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.error).toBeTruthy()

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should accept PutOptions with metadata', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const TEST_KEY = '${TEST_KEY}';
const TEST_DATA = '${TEST_DATA}';
const metadata = { foo: 'bar', timestamp: Date.now() };

await cacache.put(TEST_KEY, TEST_DATA, { metadata });
const entry = await cacache.get(TEST_KEY);

console.log(JSON.stringify({
  success: true,
  metadata: entry.metadata
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.metadata).toEqual(
      expect.objectContaining({
        foo: 'bar',
        timestamp: expect.any(Number),
      }),
    )

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should remove cache entry', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const TEST_KEY = '${TEST_KEY}';
const TEST_DATA = '${TEST_DATA}';

await cacache.put(TEST_KEY, TEST_DATA);
await cacache.remove(TEST_KEY);
const entry = await cacache.safeGet(TEST_KEY);

console.log(JSON.stringify({
  success: true,
  entry: entry
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.entry).toBeUndefined()

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should return undefined for non-existent key with safeGet', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const entry = await cacache.safeGet('non-existent-key');

console.log(JSON.stringify({
  success: true,
  entry: entry
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.entry).toBeUndefined()

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should return entry for existing key with safeGet', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const TEST_KEY = '${TEST_KEY}';
const TEST_DATA = '${TEST_DATA}';

await cacache.put(TEST_KEY, TEST_DATA);
const entry = await cacache.safeGet(TEST_KEY);

console.log(JSON.stringify({
  success: true,
  data: entry?.data.toString()
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.data).toBe(TEST_DATA)

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should clear all cache entries', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const TEST_KEY = '${TEST_KEY}';
const TEST_DATA = '${TEST_DATA}';

await cacache.put(TEST_KEY, TEST_DATA);
await cacache.clear();
const entry = await cacache.safeGet(TEST_KEY);

console.log(JSON.stringify({
  success: true,
  entry: entry
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.entry).toBeUndefined()

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should provide temporary directory for callback', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const result = await cacache.withTmp(async (tmpDirPath) => {
  return {
    tmpDir: tmpDirPath,
    hasTmpDir: !!tmpDirPath,
    isString: typeof tmpDirPath === 'string',
    result: 'test-result'
  };
});

console.log(JSON.stringify({
  success: true,
  ...result
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.result).toBe('test-result')
    expect(parsed.hasTmpDir).toBe(true)
    expect(parsed.isString).toBe(true)

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })

  it('should return callback result', async () => {
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

    const result = await runInSubprocess(
      { SOCKET_CACACHE_DIR: testCacheDir },
      `
${cacacheImport}

const result = await cacache.withTmp(async () => {
  return { value: 42 };
});

console.log(JSON.stringify({
  success: true,
  result: result
}));
      `,
    )

    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.success).toBe(true)
    expect(parsed.result).toEqual({ value: 42 })

    // Force delete temp directory outside CWD.
    await del(testCacheDir, { force: true })
  })
})
