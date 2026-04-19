/**
 * @fileoverview Emit `xport.schema.json` from the zod schema.
 *
 * The zod schema in `scripts/xport-schema.mts` is the source of truth. This
 * script writes the draft-2020-12 JSON Schema that consumers without zod
 * (editors, external validators) consume via the `$schema` reference in
 * `xport.json`.
 *
 * Run via `pnpm run xport:emit-schema` when the zod schema changes.
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'
import { getDefaultLogger } from '@socketsecurity/lib/logger'

import { XportManifestSchema } from './xport-schema.mts'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outPath = path.join(rootDir, 'xport.schema.json')

const json = z.toJSONSchema(XportManifestSchema, {
  target: 'draft-2020-12',
})

// Add the canonical $id for portability across Socket repos.
const enriched = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/SocketDev/xport.schema.json',
  title: 'xport lock-step manifest',
  ...json,
}

writeFileSync(outPath, JSON.stringify(enriched, null, 2) + '\n', 'utf8')
logger.success(`wrote ${path.relative(rootDir, outPath)}`)
