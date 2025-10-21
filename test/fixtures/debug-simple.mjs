// Import CommonJS module using createRequire.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const debugModule = require('@socketsecurity/lib/debug')
const { debug, debugDir, debugLog, debugNs, debuglog, debugtime, isDebug } =
  debugModule

const testName = process.argv[2]

if (testName === 'isDebug') {
  console.log('isDebug:', isDebug())
} else if (testName === 'debugLog') {
  debugLog('test message', 'arg2')
} else if (testName === 'debugDir') {
  debugDir({ foo: 'bar', nested: { value: 123 } })
} else if (testName === 'debugNs') {
  debugNs('test:namespace', 'message from debugNs')
} else if (testName === 'debuglog') {
  const log = debuglog('testsection')
  log('message from debuglog')
} else if (testName === 'debugtime') {
  const timer = debugtime('testsection')
  timer('basic timer')
  timer.start('test-operation')
  setTimeout(() => {
    timer.end('test-operation')
  }, 10)
} else if (testName === 'debugNs-negation') {
  debugNs('test:skip', 'this should not appear')
} else if (testName === 'debugNs-wildcard') {
  debugNs('app:feature', 'wildcard match')
}
