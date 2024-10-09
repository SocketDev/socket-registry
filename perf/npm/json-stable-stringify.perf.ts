import path from 'node:path'

import { Bench } from 'tinybench'

import fastJsonStableStringify from 'fast-json-stable-stringify'
import origJsonStableStringify from 'json-stable-stringify'
import overrideJsonStableStringify from '@socketregistry/json-stable-stringify'

// @ts-ignore
import constants from '@socketregistry/scripts/constants'
const { perfNpmFixturesPath } = constants

const sampleData5MbPath = path.join(perfNpmFixturesPath, 'sample_data_5mb.json')

;(async () => {
  const bench = new Bench({ time: 100 })
  const sampleData5MbJson = require(sampleData5MbPath)

  bench
    .add('@socketregistry/json-stable-stringify', () => {
      overrideJsonStableStringify(sampleData5MbJson)
    })
    .add('json-stable-stringify', () => {
      origJsonStableStringify(sampleData5MbJson)
    })
    .add('fast-json-stable-stringify', () => {
      fastJsonStableStringify(sampleData5MbJson)
    })

  await bench.warmup()
  await bench.run()
  console.table(bench.table())
})()
