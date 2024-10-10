import path from 'node:path'

import { Bench } from 'tinybench'

import fastJsonStableStringify from 'fast-json-stable-stringify'
import origJsonStableStringify from 'json-stable-stringify'
import overrideJsonStableStringify from '@socketregistry/json-stable-stringify'

// @ts-ignore
import constants from '@socketregistry/scripts/constants'
const { perfNpmFixturesPath } = constants

const sampleData2MbPath = path.join(perfNpmFixturesPath, 'sample_data_2mb.json')
const sampleData5MbPath = path.join(perfNpmFixturesPath, 'sample_data_5mb.json')

;(async () => {
  const tests = [
    { name: 'sample_data_2mb.json', data: require(sampleData2MbPath) },
    { name: 'sample_data_5mb.json', data: require(sampleData5MbPath) }
  ]
  for (const { name, data } of tests) {
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
    await bench.warmup()
    await bench.run()
    console.log(name)
    console.table(bench.table())
  }
})()
