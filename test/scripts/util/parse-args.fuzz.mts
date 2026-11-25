import { fuzz } from '@vitiate/core'

import { parseArgs } from '../../../scripts/util/parse-args.mts'

fuzz('parses arguments from arbitrary text', data => {
  parseArgs({ args: data.toString('utf8').split('\0'), strict: false })
})
