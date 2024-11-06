/* eslint-disable n/no-deprecated-api */
import assert from 'node:assert/strict'
import buffer from 'node:buffer'
import { describe, it } from 'node:test'

import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const eco = 'npm'
const regPkgName = 'safer-buffer'

// safer-buffer tests assume Buffer.alloc, Buffer.allocUnsafe, and
// Buffer.allocUnsafeSlow throw for a size of 2 * (1 << 30), i.e. 2147483648,
// which is no longer the case.
// https://github.com/ChALkeR/safer-buffer/issues/16
// https://github.com/ChALkeR/safer-buffer/blob/v2.1.2/tests.js
describe(
  `${eco} > ${regPkgName}`,
  { skip: isPackageTestingSkipped(eco, regPkgName) },
  () => {
    const index: any = require(regPkgName)
    const safer: any = require(`${regPkgName}/safer`)
    const dangerous: any = require(`${regPkgName}/dangerous`)
    const implementations = [index, safer, dangerous]

    it('Default is Safer', () => {
      assert.equal(index, safer)
      assert.notEqual(safer, dangerous)
      assert.notEqual(index, dangerous)
    })

    it('Is not a function', () => {
      for (const impl of implementations) {
        assert.equal(typeof impl, 'object')
        assert.equal(typeof impl.Buffer, 'object')
      }
      assert.equal(typeof buffer, 'object')
      assert.equal(typeof buffer.Buffer, 'function')
    })

    it('Constructor throws', () => {
      for (const impl of implementations) {
        assert.throws(() => {
          impl.Buffer()
        })
        assert.throws(() => {
          impl.Buffer(0)
        })
        assert.throws(() => {
          impl.Buffer('a')
        })
        assert.throws(() => {
          impl.Buffer('a', 'utf-8')
        })
        assert.throws(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer()
        })
        assert.throws(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer(0)
        })
        assert.throws(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer('a')
        })
        assert.throws(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer('a', 'utf-8')
        })
      }
    })

    it('Safe methods exist', () => {
      for (const impl of implementations) {
        assert.equal(typeof impl.Buffer.alloc, 'function', 'alloc')
        assert.equal(typeof impl.Buffer.from, 'function', 'from')
      }
    })

    it('Unsafe methods exist only in Dangerous', () => {
      for (const impl of [index, safer]) {
        assert.equal(typeof impl.Buffer.allocUnsafe, 'undefined')
        assert.equal(typeof impl.Buffer.allocUnsafeSlow, 'undefined')
      }
      assert.equal(typeof dangerous.Buffer.allocUnsafe, 'function')
      assert.equal(typeof dangerous.Buffer.allocUnsafeSlow, 'function')
    })

    it('Generic methods/properties are defined and equal', () => {
      for (const method of ['poolSize', 'isBuffer', 'concat', 'byteLength']) {
        for (const impl of implementations) {
          assert.equal(
            impl.Buffer[method],
            (buffer as any).Buffer[method],
            method
          )
          assert.notEqual(typeof impl.Buffer[method], 'undefined', method)
        }
      }
    })

    it('Built-in buffer static methods/properties are inherited', () => {
      for (const method of Object.keys(buffer)) {
        if (method === 'SlowBuffer' || method === 'Buffer') continue
        for (const impl of implementations) {
          assert.equal(impl[method], (buffer as any)[method], method)
          assert.notEqual(typeof impl[method], 'undefined', method)
        }
      }
    })

    it('Built-in Buffer static methods/properties are inherited', () => {
      for (const method of Object.keys(buffer.Buffer)) {
        if (method === 'allocUnsafe' || method === 'allocUnsafeSlow') continue
        for (const impl of implementations) {
          assert.equal(
            impl.Buffer[method],
            (buffer as any).Buffer[method],
            method
          )
          assert.notEqual(typeof impl.Buffer[method], 'undefined', method)
        }
      }
    })

    it('.prototype property of Buffer is inherited', () => {
      for (const impl of implementations) {
        assert.equal(
          impl.Buffer.prototype,
          buffer.Buffer.prototype,
          'prototype'
        )
        assert.notEqual(typeof impl.Buffer.prototype, 'undefined', 'prototype')
      }
    })

    it('All Safer methods are present in Dangerous', () => {
      for (const method of Object.keys(safer)) {
        if (method === 'Buffer') continue
        for (const impl of implementations) {
          assert.equal(impl[method], safer[method], method)
          if (method !== 'kStringMaxLength') {
            assert.notEqual(typeof impl[method], 'undefined', method)
          }
        }
      }
      for (const method of Object.keys(safer.Buffer)) {
        for (const impl of implementations) {
          assert.equal(impl.Buffer[method], safer.Buffer[method], method)
          assert.notEqual(typeof impl.Buffer[method], 'undefined', method)
        }
      }
    })

    it('Safe methods from Dangerous methods are present in Safer', () => {
      for (const method of Object.keys(dangerous)) {
        if (method === 'Buffer') continue
        for (const impl of implementations) {
          assert.equal(impl[method], dangerous[method], method)
          if (method !== 'kStringMaxLength') {
            assert.notEqual(typeof impl[method], 'undefined', method)
          }
        }
      }
      for (const method of Object.keys(dangerous.Buffer)) {
        if (method === 'allocUnsafe' || method === 'allocUnsafeSlow') continue
        for (const impl of implementations) {
          assert.equal(impl.Buffer[method], dangerous.Buffer[method], method)
          assert.notEqual(typeof impl.Buffer[method], 'undefined', method)
        }
      }
    })

    /* Behaviour tests */

    it('Methods return Buffers', () => {
      for (const impl of implementations) {
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.alloc(0)))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.alloc(0, 10)))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.alloc(0, 'a')))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.alloc(10)))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.alloc(10, 'x')))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.alloc(9, 'ab')))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.from('')))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.from('string')))
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.from('string', 'utf-8')))
        assert.ok(
          buffer.Buffer.isBuffer(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64'))
        )
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.from([0, 42, 3])))
        assert.ok(
          buffer.Buffer.isBuffer(impl.Buffer.from(new Uint8Array([0, 42, 3])))
        )
        assert.ok(buffer.Buffer.isBuffer(impl.Buffer.from([])))
      }
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        assert.ok(buffer.Buffer.isBuffer(dangerous.Buffer[method](0)))
        assert.ok(buffer.Buffer.isBuffer(dangerous.Buffer[method](10)))
      }
    })

    it('Constructor is buffer.Buffer', () => {
      for (const impl of implementations) {
        assert.equal(impl.Buffer.alloc(0).constructor, buffer.Buffer)
        assert.equal(impl.Buffer.alloc(0, 10).constructor, buffer.Buffer)
        assert.equal(impl.Buffer.alloc(0, 'a').constructor, buffer.Buffer)
        assert.equal(impl.Buffer.alloc(10).constructor, buffer.Buffer)
        assert.equal(impl.Buffer.alloc(10, 'x').constructor, buffer.Buffer)
        assert.equal(impl.Buffer.alloc(9, 'ab').constructor, buffer.Buffer)
        assert.equal(impl.Buffer.from('').constructor, buffer.Buffer)
        assert.equal(impl.Buffer.from('string').constructor, buffer.Buffer)
        assert.equal(
          impl.Buffer.from('string', 'utf-8').constructor,
          buffer.Buffer
        )
        assert.equal(
          impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64').constructor,
          buffer.Buffer
        )
        assert.equal(impl.Buffer.from([0, 42, 3]).constructor, buffer.Buffer)
        assert.equal(
          impl.Buffer.from(new Uint8Array([0, 42, 3])).constructor,
          buffer.Buffer
        )
        assert.equal(impl.Buffer.from([]).constructor, buffer.Buffer)
      }
      for (const arg of [0, 10, 100]) {
        assert.equal(
          dangerous.Buffer.allocUnsafe(arg).constructor,
          buffer.Buffer
        )
        assert.equal(
          dangerous.Buffer.allocUnsafeSlow(arg).constructor,
          (buffer as any).SlowBuffer(0).constructor
        )
      }
    })

    it('Invalid calls throw', () => {
      for (const impl of implementations) {
        assert.throws(() => {
          impl.Buffer.from(0)
        })
        assert.throws(() => {
          impl.Buffer.from(10)
        })
        assert.throws(() => {
          impl.Buffer.from(10, 'utf-8')
        })
        assert.throws(() => {
          impl.Buffer.from('string', 'invalid encoding')
        })
        assert.throws(() => {
          impl.Buffer.from(-10)
        })
        assert.throws(() => {
          impl.Buffer.from(1e90)
        })
        assert.throws(() => {
          impl.Buffer.from(Infinity)
        })
        assert.throws(() => {
          impl.Buffer.from(-Infinity)
        })
        assert.throws(() => {
          impl.Buffer.from(NaN)
        })
        assert.throws(() => {
          impl.Buffer.from(null)
        })
        assert.throws(() => {
          impl.Buffer.from(undefined)
        })
        assert.throws(() => {
          impl.Buffer.from()
        })
        assert.throws(() => {
          impl.Buffer.from({})
        })
        assert.throws(() => {
          impl.Buffer.alloc('')
        })
        assert.throws(() => {
          impl.Buffer.alloc('string')
        })
        assert.throws(() => {
          impl.Buffer.alloc('string', 'utf-8')
        })
        assert.throws(() => {
          impl.Buffer.alloc('b25ldHdvdGhyZWU=', 'base64')
        })
        assert.throws(() => {
          impl.Buffer.alloc(-10)
        })
        assert.throws(() => {
          impl.Buffer.alloc(1e90)
        })
        // Modern builtin Buffer.alloc does NOT throw.
        // https://github.com/ChALkeR/safer-buffer/issues/16
        assert.doesNotThrow(() => {
          impl.Buffer.alloc(2 * (1 << 30))
        })
        assert.throws(() => {
          impl.Buffer.alloc(Infinity)
        })
        assert.throws(() => {
          impl.Buffer.alloc(-Infinity)
        })
        assert.throws(() => {
          impl.Buffer.alloc(null)
        })
        assert.throws(() => {
          impl.Buffer.alloc(undefined)
        })
        assert.throws(() => {
          impl.Buffer.alloc()
        })
        assert.throws(() => {
          impl.Buffer.alloc([])
        })
        assert.throws(() => {
          impl.Buffer.alloc([0, 42, 3])
        })
        assert.throws(() => {
          impl.Buffer.alloc({})
        })
      }
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        assert.throws(() => {
          dangerous.Buffer[method]('')
        })
        assert.throws(() => {
          dangerous.Buffer[method]('string')
        })
        assert.throws(() => {
          dangerous.Buffer[method]('string', 'utf-8')
        })
        // Modern builtin Buffer.allocUnsafe and Buffer.allocUnsafeSlow do NOT throw.
        // https://github.com/ChALkeR/safer-buffer/issues/16
        assert.doesNotThrow(() => {
          dangerous.Buffer[method](2 * (1 << 30))
        })
        assert.throws(() => {
          dangerous.Buffer[method](Infinity)
        })
        if (dangerous.Buffer[method] === buffer.Buffer.allocUnsafe) {
          console.log(
            'Skipping, older impl of allocUnsafe coerced negative sizes to 0'
          )
        } else {
          assert.throws(() => {
            dangerous.Buffer[method](-10)
          })
          assert.throws(() => {
            dangerous.Buffer[method](-1e90)
          })
          assert.throws(() => {
            dangerous.Buffer[method](-Infinity)
          })
        }
        assert.throws(() => {
          dangerous.Buffer[method](null)
        })
        assert.throws(() => {
          dangerous.Buffer[method](undefined)
        })
        assert.throws(() => {
          dangerous.Buffer[method]()
        })
        assert.throws(() => {
          dangerous.Buffer[method]([])
        })
        assert.throws(() => {
          dangerous.Buffer[method]([0, 42, 3])
        })
        assert.throws(() => {
          dangerous.Buffer[method]({})
        })
      }
    })

    it('Buffers have appropriate lengths', () => {
      for (const impl of implementations) {
        assert.equal(impl.Buffer.alloc(0).length, 0)
        assert.equal(impl.Buffer.alloc(10).length, 10)
        assert.equal(impl.Buffer.from('').length, 0)
        assert.equal(impl.Buffer.from('string').length, 6)
        assert.equal(impl.Buffer.from('string', 'utf-8').length, 6)
        assert.equal(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64').length, 11)
        assert.equal(impl.Buffer.from([0, 42, 3]).length, 3)
        assert.equal(impl.Buffer.from(new Uint8Array([0, 42, 3])).length, 3)
        assert.equal(impl.Buffer.from([]).length, 0)
      }
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        assert.equal(dangerous.Buffer[method](0).length, 0)
        assert.equal(dangerous.Buffer[method](10).length, 10)
      }
    })

    it('Buffers have appropriate lengths (2)', () => {
      assert.equal(index.Buffer.alloc, safer.Buffer.alloc)
      assert.equal(index.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (const method of [
        safer.Buffer.alloc,
        dangerous.Buffer.allocUnsafe,
        dangerous.Buffer.allocUnsafeSlow
      ]) {
        for (let i = 0; i < 1e2; i++) {
          const length = Math.round(Math.random() * 1e5)
          const buf = method(length)
          if (!buffer.Buffer.isBuffer(buf)) ok = false
          if (buf.length !== length) ok = false
        }
      }
      assert.ok(ok)
    })

    it('.alloc(size) is zero-filled and has correct length', () => {
      assert.equal(index.Buffer.alloc, safer.Buffer.alloc)
      assert.equal(index.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (let i = 0; i < 1e2; i++) {
        const length = Math.round(Math.random() * 2e6)
        const buf = index.Buffer.alloc(length)
        if (!buffer.Buffer.isBuffer(buf)) ok = false
        if (buf.length !== length) ok = false
        let j
        for (j = 0; j < length; j++) {
          if (buf[j] !== 0) ok = false
        }
        buf.fill(1)
        for (j = 0; j < length; j++) {
          if (buf[j] !== 1) ok = false
        }
      }
      assert.ok(ok)
    })

    it('.allocUnsafe / .allocUnsafeSlow are fillable and have correct lengths', () => {
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        let ok = true
        for (let i = 0; i < 1e2; i++) {
          const length = Math.round(Math.random() * 2e6)
          const buf = dangerous.Buffer[method](length)
          if (!buffer.Buffer.isBuffer(buf)) ok = false
          if (buf.length !== length) ok = false
          buf.fill(0, 0, length)
          let j
          for (j = 0; j < length; j++) {
            if (buf[j] !== 0) ok = false
          }
          buf.fill(1, 0, length)
          for (j = 0; j < length; j++) {
            if (buf[j] !== 1) ok = false
          }
        }
        assert.ok(ok, method)
      }
    })

    it('.alloc(size, fill) is `fill`-filled', () => {
      assert.equal(index.Buffer.alloc, safer.Buffer.alloc)
      assert.equal(index.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (let i = 0; i < 1e2; i++) {
        const length = Math.round(Math.random() * 2e6)
        const fill = Math.round(Math.random() * 255)
        const buf = index.Buffer.alloc(length, fill)
        if (!buffer.Buffer.isBuffer(buf)) ok = false
        if (buf.length !== length) ok = false
        for (let j = 0; j < length; j++) {
          if (buf[j] !== fill) ok = false
        }
      }
      assert.ok(ok)
    })

    it('.alloc(size, fill) is `fill`-filled', () => {
      assert.equal(index.Buffer.alloc, safer.Buffer.alloc)
      assert.equal(index.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (let i = 0; i < 1e2; i++) {
        const length = Math.round(Math.random() * 2e6)
        const fill = Math.round(Math.random() * 255)
        const buf = index.Buffer.alloc(length, fill)
        if (!buffer.Buffer.isBuffer(buf)) ok = false
        if (buf.length !== length) ok = false
        for (let j = 0; j < length; j++) {
          if (buf[j] !== fill) ok = false
        }
      }
      assert.ok(ok)
      assert.deepEqual(index.Buffer.alloc(9, 'a'), index.Buffer.alloc(9, 97))
      assert.notDeepEqual(index.Buffer.alloc(9, 'a'), index.Buffer.alloc(9, 98))

      const tmp = new buffer.Buffer(2)
      tmp.fill('ok')
      if (tmp[1] === tmp[0]) {
        // Outdated Node.js
        assert.deepEqual(
          index.Buffer.alloc(5, 'ok'),
          index.Buffer.from('ooooo')
        )
      } else {
        assert.deepEqual(
          index.Buffer.alloc(5, 'ok'),
          index.Buffer.from('okoko')
        )
      }
      assert.notDeepEqual(
        index.Buffer.alloc(5, 'ok'),
        index.Buffer.from('kokok')
      )
    })

    it('safer.Buffer.from returns results same as Buffer constructor', () => {
      for (const impl of implementations) {
        assert.deepEqual(impl.Buffer.from(''), new buffer.Buffer(''))
        assert.deepEqual(
          impl.Buffer.from('string'),
          new buffer.Buffer('string')
        )
        assert.deepEqual(
          impl.Buffer.from('string', 'utf-8'),
          new buffer.Buffer('string', 'utf-8')
        )
        assert.deepEqual(
          impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64'),
          new buffer.Buffer('b25ldHdvdGhyZWU=', 'base64')
        )
        assert.deepEqual(
          impl.Buffer.from([0, 42, 3]),
          new buffer.Buffer([0, 42, 3])
        )
        assert.deepEqual(
          impl.Buffer.from(new Uint8Array([0, 42, 3])),
          new buffer.Buffer(new Uint8Array([0, 42, 3]))
        )
        assert.deepEqual(impl.Buffer.from([]), new buffer.Buffer([]))
      }
    })

    it('safer.Buffer.from returns consistent results', () => {
      for (const impl of implementations) {
        assert.deepEqual(impl.Buffer.from(''), impl.Buffer.alloc(0))
        assert.deepEqual(impl.Buffer.from([]), impl.Buffer.alloc(0))
        assert.deepEqual(
          impl.Buffer.from(new Uint8Array([])),
          impl.Buffer.alloc(0)
        )
        assert.deepEqual(
          impl.Buffer.from('string', 'utf-8'),
          impl.Buffer.from('string')
        )
        assert.deepEqual(
          impl.Buffer.from('string'),
          impl.Buffer.from([115, 116, 114, 105, 110, 103])
        )
        assert.deepEqual(
          impl.Buffer.from('string'),
          impl.Buffer.from(impl.Buffer.from('string'))
        )
        assert.deepEqual(
          impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64'),
          impl.Buffer.from('onetwothree')
        )
        assert.notDeepEqual(
          impl.Buffer.from('b25ldHdvdGhyZWU='),
          impl.Buffer.from('onetwothree')
        )
      }
    })
  }
)
