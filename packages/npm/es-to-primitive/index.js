'use strict'

const ES5 = require('./es5')
const ES6 = require('./es6')
const ES2015 = require('./es2015')

module.exports = ES2015
module.exports.ES5 = ES5
module.exports.ES6 = ES6
module.exports.ES2015 = ES2015

Object.defineProperty(ES2015, 'ES5', { enumerable: false })
Object.defineProperty(ES2015, 'ES6', { enumerable: false })
Object.defineProperty(ES2015, 'ES2015', { enumerable: false })
