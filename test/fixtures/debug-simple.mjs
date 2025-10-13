// Import CommonJS module using createRequire.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const debug = require('../../registry/dist/lib/debug.js')
const {
  debugDir: debugDirSimple,
  debugNs: debugFnSimple,
  debugLog: debugLogSimple,
  debug: debuglog,
  debugCache: debugtime,
  isDebug: isDebugSimple,
} = debug

const testName = process.argv[2]

if (testName === 'isDebugSimple') {
  console.log('isDebugSimple:', isDebugSimple())
} else if (testName === 'debugLogSimple') {
  debugLogSimple('test message', 'arg2')
} else if (testName === 'debugDirSimple') {
  debugDirSimple({ foo: 'bar', nested: { value: 123 } })
} else if (testName === 'debugFnSimple') {
  const log = debugFnSimple('test:namespace')
  log('message from debugFnSimple')
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
} else if (testName === 'debugFnSimple-negation') {
  const log = debugFnSimple('test:skip')
  log('this should not appear')
} else if (testName === 'debugFnSimple-wildcard') {
  const log = debugFnSimple('app:feature')
  log('wildcard match')
}
