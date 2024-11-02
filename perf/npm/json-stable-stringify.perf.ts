import assert from 'node:assert/strict'
import path from 'node:path'

import { Bench } from 'tinybench'

import fastJsonStableStringify from 'fast-json-stable-stringify'
import origJsonStableStringify from 'json-stable-stringify'
import overrideJsonStableStringify from '@socketregistry/json-stable-stringify'

// @ts-ignore
import constants from '@socketregistry/scripts/constants'
const { perfNpmFixturesPath } = constants

;(async () => {
  const sampleData2MbJson = require(
    path.join(perfNpmFixturesPath, 'sample_data_2mb.json')
  )
  const sampleData6MbJson = {
    a: sampleData2MbJson,
    b: sampleData2MbJson,
    c: sampleData2MbJson
  }
  const tests = [
    { name: '2MB json file', data: sampleData2MbJson },
    { name: '6MB json file', data: sampleData6MbJson }
  ]
  for (const { name, data } of tests) {
    ;[
      overrideJsonStableStringify(data),
      origJsonStableStringify(data),
      fastJsonStableStringify(data)
    ].reduce((a, v) => {
      assert.strictEqual(a, v)
      return v
    })
    const bench = new Bench({ time: 100 })
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
    await bench.warmup()
    // eslint-disable-next-line no-await-in-loop
    await bench.run()
    console.log(name)
    console.table(bench.table())
  }
})()
