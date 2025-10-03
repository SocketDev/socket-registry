import assert from 'node:assert/strict'
import path from 'node:path'

import fastJsonStableStringify from 'fast-json-stable-stringify'
// eslint-disable-next-line import-x/no-duplicates
import origJsonStableStringify from 'json-stable-stringify'
import { Bench } from 'tinybench'

// eslint-disable-next-line import-x/no-duplicates
import overrideJsonStableStringify from '@socketregistry/json-stable-stringify'
import { logger } from '@socketsecurity/registry/lib/logger'

import constants from '../../scripts/constants.mjs'

void (async () => {
  const sampleData2MbJson = require(
    path.join(constants.perfNpmFixturesPath, 'sample_data_2mb.json'),
  )
  const sampleData6MbJson = {
    a: sampleData2MbJson,
    b: sampleData2MbJson,
    c: sampleData2MbJson,
  }
  const tests = [
    { name: '2MB json file', data: sampleData2MbJson },
    { name: '6MB json file', data: sampleData6MbJson },
  ]
  for (const { data, name } of tests) {
    ;[
      overrideJsonStableStringify(data),
      origJsonStableStringify(data),
      fastJsonStableStringify(data),
    ].reduce((a, v) => {
      assert.strictEqual(a, v)
      return v
    })
    const bench = new Bench({ time: 100, warmup: true })
    bench
      .add('@socketregistry/json-stable-stringify', () => {
        overrideJsonStableStringify(data)
      })
      .add('json-stable-stringify', () => {
        origJsonStableStringify(data)
      })
      .add('fast-json-stable-stringify', () => {
        fastJsonStableStringify(data)
      })
    // eslint-disable-next-line no-await-in-loop
    await bench.run()
    logger.log(name)
    logger.table(bench.table(), undefined)
  }
})()
