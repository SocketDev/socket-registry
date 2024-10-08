import path from 'node:path'

import { Bench } from 'tinybench'

import overrideJsonStableStringify from '@socketregistry/json-stable-stringify'
import origJsonStableStringify from 'json-stable-stringify'

// @ts-ignore
import constants from '@socketregistry/scripts/constants'
const { perfNpmFixturesPath } = constants

const sampleData5MbPath = path.join(perfNpmFixturesPath, 'sample_data_5mb.json')

;(async () => {
  const bench = new Bench({ time: 100 })
  const sampleData5MbJson = require(sampleData5MbPath)

  bench
    .add('faster task', async () => {
      overrideJsonStableStringify(sampleData5MbJson)
    })
    .add('slower task', async () => {
      origJsonStableStringify(sampleData5MbJson)
    })

  await bench.warmup()
  await bench.run()
  console.table(bench.table())
})()
