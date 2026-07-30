import ES5 = require('./es5')
import ES2015 = require('./es2015')

declare const toPrimitive: typeof ES2015 & {
  ES5: typeof ES5
  ES6: typeof ES2015
  ES2015: typeof ES2015
}
export = toPrimitive
