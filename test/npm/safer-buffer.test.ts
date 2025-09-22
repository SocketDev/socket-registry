/* eslint-disable n/no-deprecated-api */
import buffer from 'node:buffer'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'
import { logger } from '@socketsecurity/registry/lib/logger'

const { NPM, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)

// safer-buffer tests assume Buffer.alloc, Buffer.allocUnsafe, and
// Buffer.allocUnsafeSlow throw for a size of 2 * (1 << 30), i.e. 2147483648,
// which is no longer the case.
// https://github.com/ChALkeR/safer-buffer/issues/16
// https://github.com/ChALkeR/safer-buffer/blob/v2.1.2/tests.js
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    const safer = require(path.join(pkgPath, 'safer.js'))
    const dangerous = require(path.join(pkgPath, 'dangerous.js'))
    const implementations = [safer, dangerous]

    it('Default is Safer', () => {
      expect(safer === dangerous).toBe(false)
    })

    it('Is not a function', () => {
      for (const impl of implementations) {
        expect(typeof impl).toBe('object')
        expect(typeof impl.Buffer).toBe('object')
      }
      expect(typeof buffer).toBe('object')
      expect(typeof buffer.Buffer).toBe('function')
    })

    it('Constructor throws', () => {
      for (const impl of implementations) {
        expect(() => {
          impl.Buffer()
        }).toThrow()
        expect(() => {
          impl.Buffer(0)
        }).toThrow()
        expect(() => {
          impl.Buffer('a')
        }).toThrow()
        expect(() => {
          impl.Buffer('a', 'utf-8')
        }).toThrow()
        expect(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer()
        }).toThrow()
        expect(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer(0)
        }).toThrow()
        expect(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer('a')
        }).toThrow()
        expect(() => {
          // eslint-disable-next-line no-new
          new impl.Buffer('a', 'utf-8')
        }).toThrow()
      }
    })

    it('Safe methods exist', () => {
      for (const impl of implementations) {
        expect(typeof impl.Buffer.alloc).toBe('function')
        expect(typeof impl.Buffer.from).toBe('function')
      }
    })

    it('Unsafe methods exist only in Dangerous', () => {
      expect(typeof safer.Buffer.allocUnsafe).toBe('undefined')
      expect(typeof safer.Buffer.allocUnsafeSlow).toBe('undefined')
      expect(typeof dangerous.Buffer.allocUnsafe).toBe('function')
      expect(typeof dangerous.Buffer.allocUnsafeSlow).toBe('function')
    })

    it('Generic methods/properties are defined and equal', () => {
      for (const method of ['poolSize', 'isBuffer', 'concat', 'byteLength']) {
        for (const impl of implementations) {
          expect(impl.Buffer[method]).toBe((buffer as any).Buffer[method])
          expect(typeof impl.Buffer[method]).not.toBe('undefined')
        }
      }
    })

    it('Built-in buffer static methods/properties are inherited', () => {
      for (const method of Object.keys(buffer)) {
        if (method === 'SlowBuffer' || method === 'Buffer') {
          continue
        }
        for (const impl of implementations) {
          expect(impl[method]).toBe((buffer as any)[method])
          expect(typeof impl[method]).not.toBe('undefined')
        }
      }
    })

    it('Built-in Buffer static methods/properties are inherited', () => {
      for (const method of Object.keys(buffer.Buffer)) {
        if (method === 'allocUnsafe' || method === 'allocUnsafeSlow') {
          continue
        }
        for (const impl of implementations) {
          expect(impl.Buffer[method]).toBe((buffer as any).Buffer[method])
          expect(typeof impl.Buffer[method]).not.toBe('undefined')
        }
      }
    })

    it('.prototype property of Buffer is inherited', () => {
      for (const impl of implementations) {
        expect(impl.Buffer.prototype).toBe(buffer.Buffer.prototype)
        expect(typeof impl.Buffer.prototype).not.toBe('undefined')
      }
    })

    it('All Safer methods are present in Dangerous', () => {
      for (const method of Object.keys(safer)) {
        if (method === 'Buffer') {
          continue
        }
        for (const impl of implementations) {
          expect(impl[method]).toBe(safer[method])
          expect(typeof impl[method]).not.toBe('undefined')
        }
      }
      for (const method of Object.keys(safer.Buffer)) {
        for (const impl of implementations) {
          expect(impl.Buffer[method]).toBe(safer.Buffer[method])
          expect(typeof impl.Buffer[method]).not.toBe('undefined')
        }
      }
    })

    it('Safe methods from Dangerous methods are present in Safer', () => {
      for (const method of Object.keys(dangerous)) {
        if (method === 'Buffer') {
          continue
        }
        for (const impl of implementations) {
          expect(impl[method]).toBe(dangerous[method])
          expect(typeof impl[method]).not.toBe('undefined')
        }
      }
      for (const method of Object.keys(dangerous.Buffer)) {
        if (method === 'allocUnsafe' || method === 'allocUnsafeSlow') {
          continue
        }
        for (const impl of implementations) {
          expect(impl.Buffer[method]).toBe(dangerous.Buffer[method])
          expect(typeof impl.Buffer[method]).not.toBe('undefined')
        }
      }
    })

    /* Behaviour tests */

    it('Methods return Buffers', () => {
      for (const impl of implementations) {
        expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(0))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(0, 10))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(0, 'a'))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(10))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(10, 'x'))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(9, 'ab'))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.from(''))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.from('string'))).toBe(true)
        expect(buffer.Buffer.isBuffer(impl.Buffer.from('string', 'utf-8')))
        expect(
          buffer.Buffer.isBuffer(
            impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64'),
          ),
        )
        expect(buffer.Buffer.isBuffer(impl.Buffer.from([0, 42, 3])))
        expect(
          buffer.Buffer.isBuffer(impl.Buffer.from(new Uint8Array([0, 42, 3]))),
        )
        expect(buffer.Buffer.isBuffer(impl.Buffer.from([])))
      }
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        expect(buffer.Buffer.isBuffer(dangerous.Buffer[method](0)))
        expect(buffer.Buffer.isBuffer(dangerous.Buffer[method](10)))
      }
    })

    it('Constructor is buffer.Buffer', () => {
      for (const impl of implementations) {
        expect(impl.Buffer.alloc(0).constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.alloc(0, 10).constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.alloc(0, 'a').constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.alloc(10).constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.alloc(10, 'x').constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.alloc(9, 'ab').constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.from('').constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.from('string').constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.from('string', 'utf-8').constructor).toBe(
          buffer.Buffer,
        )
        expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64').constructor).toBe(
          buffer.Buffer,
        )
        expect(impl.Buffer.from([0, 42, 3]).constructor).toBe(buffer.Buffer)
        expect(impl.Buffer.from(new Uint8Array([0, 42, 3])).constructor).toBe(
          buffer.Buffer,
        )
        expect(impl.Buffer.from([]).constructor).toBe(buffer.Buffer)
      }
      for (const arg of [0, 10, 100]) {
        expect(dangerous.Buffer.allocUnsafe(arg).constructor).toBe(
          buffer.Buffer,
        )
        expect(dangerous.Buffer.allocUnsafeSlow(arg).constructor).toBe(
          buffer.Buffer,
        )
      }
    })

    it('Invalid calls throw', () => {
      for (const impl of implementations) {
        expect(() => {
          impl.Buffer.from(0)
        })
        expect(() => {
          impl.Buffer.from(10)
        })
        expect(() => {
          impl.Buffer.from(10, 'utf-8')
        })
        expect(() => {
          impl.Buffer.from('string', 'invalid encoding')
        })
        expect(() => {
          impl.Buffer.from(-10)
        })
        expect(() => {
          impl.Buffer.from(1e90)
        })
        expect(() => {
          impl.Buffer.from(Infinity)
        })
        expect(() => {
          impl.Buffer.from(-Infinity)
        })
        expect(() => {
          impl.Buffer.from(NaN)
        })
        expect(() => {
          impl.Buffer.from(null)
        })
        expect(() => {
          impl.Buffer.from(undefined)
        })
        expect(() => {
          impl.Buffer.from()
        })
        expect(() => {
          impl.Buffer.from({})
        })
        expect(() => {
          impl.Buffer.alloc('')
        })
        expect(() => {
          impl.Buffer.alloc('string')
        })
        expect(() => {
          impl.Buffer.alloc('string', 'utf-8')
        })
        expect(() => {
          impl.Buffer.alloc('b25ldHdvdGhyZWU=', 'base64')
        })
        expect(() => {
          impl.Buffer.alloc(-10)
        })
        expect(() => {
          impl.Buffer.alloc(1e90)
        })
        // Modern builtin Buffer.alloc does NOT throw.
        // https://github.com/ChALkeR/safer-buffer/issues/16
        expect(() => {
          impl.Buffer.alloc(2 * (1 << 30))
        }).not.toThrow()
        expect(() => {
          impl.Buffer.alloc(Infinity)
        })
        expect(() => {
          impl.Buffer.alloc(-Infinity)
        })
        expect(() => {
          impl.Buffer.alloc(null)
        })
        expect(() => {
          impl.Buffer.alloc(undefined)
        })
        expect(() => {
          impl.Buffer.alloc()
        }).toThrow()
        expect(() => {
          impl.Buffer.alloc([])
        })
        expect(() => {
          impl.Buffer.alloc([0, 42, 3])
        })
        expect(() => {
          impl.Buffer.alloc({})
        })
      }
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        expect(() => {
          dangerous.Buffer[method]('')
        })
        expect(() => {
          dangerous.Buffer[method]('string')
        })
        expect(() => {
          dangerous.Buffer[method]('string', 'utf-8')
        })
        // Modern builtin Buffer.allocUnsafe and Buffer.allocUnsafeSlow do NOT throw.
        // https://github.com/ChALkeR/safer-buffer/issues/16
        expect(() => {
          dangerous.Buffer[method](2 * (1 << 30))
        }).not.toThrow()
        expect(() => {
          dangerous.Buffer[method](Infinity)
        })
        if (dangerous.Buffer[method] === buffer.Buffer.allocUnsafe) {
          logger.info(
            'Skipping, older impl of allocUnsafe coerced negative sizes to 0',
          )
        } else {
          expect(() => {
            dangerous.Buffer[method](-10)
          })
          expect(() => {
            dangerous.Buffer[method](-1e90)
          })
          expect(() => {
            dangerous.Buffer[method](-Infinity)
          })
        }
        expect(() => {
          dangerous.Buffer[method](null)
        })
        expect(() => {
          dangerous.Buffer[method](undefined)
        })
        expect(() => {
          dangerous.Buffer[method]()
        })
        expect(() => {
          dangerous.Buffer[method]([])
        })
        expect(() => {
          dangerous.Buffer[method]([0, 42, 3])
        })
        expect(() => {
          dangerous.Buffer[method]({})
        })
      }
    })

    it('Buffers have appropriate lengths', () => {
      for (const impl of implementations) {
        expect(impl.Buffer.alloc(0).length).toBe(0)
        expect(impl.Buffer.alloc(10).length).toBe(10)
        expect(impl.Buffer.from('').length).toBe(0)
        expect(impl.Buffer.from('string').length).toBe(6)
        expect(impl.Buffer.from('string', 'utf-8').length).toBe(6)
        expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64').length).toBe(11)
        expect(impl.Buffer.from([0, 42, 3]).length).toBe(3)
        expect(impl.Buffer.from(new Uint8Array([0, 42, 3])).length).toBe(3)
        expect(impl.Buffer.from([]).length).toBe(0)
      }
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        expect(dangerous.Buffer[method](0).length).toBe(0)
        expect(dangerous.Buffer[method](10).length).toBe(10)
      }
    })

    it('Buffers have appropriate lengths (2)', () => {
      expect(safer.Buffer.alloc, safer.Buffer.alloc)
      expect(safer.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (const method of [
        safer.Buffer.alloc,
        dangerous.Buffer.allocUnsafe,
        dangerous.Buffer.allocUnsafeSlow,
      ]) {
        for (let i = 0; i < 1e2; i += 1) {
          const length = Math.round(Math.random() * 1e5)
          const buf = method(length)
          if (!buffer.Buffer.isBuffer(buf)) {
            ok = false
          }
          if (buf.length !== length) {
            ok = false
          }
        }
      }
      expect(ok)
    })

    it('.alloc(size) is zero-filled and has correct length', () => {
      expect(safer.Buffer.alloc, safer.Buffer.alloc)
      expect(safer.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (let i = 0; i < 1e2; i += 1) {
        const length = Math.round(Math.random() * 2e6)
        const buf = safer.Buffer.alloc(length)
        if (!buffer.Buffer.isBuffer(buf)) {
          ok = false
        }
        if (buf.length !== length) {
          ok = false
        }
        let j
        for (j = 0; j < length; j += 1) {
          if (buf[j] !== 0) {
            ok = false
          }
        }
        buf.fill(1)
        for (j = 0; j < length; j += 1) {
          if (buf[j] !== 1) {
            ok = false
          }
        }
      }
      expect(ok)
    })

    it('.allocUnsafe / .allocUnsafeSlow are fillable and have correct lengths', () => {
      for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
        let ok = true
        for (let i = 0; i < 1e2; i += 1) {
          const length = Math.round(Math.random() * 2e6)
          const buf = dangerous.Buffer[method](length)
          if (!buffer.Buffer.isBuffer(buf)) {
            ok = false
          }
          if (buf.length !== length) {
            ok = false
          }
          buf.fill(0, 0, length)
          let j
          for (j = 0; j < length; j += 1) {
            if (buf[j] !== 0) {
              ok = false
            }
          }
          buf.fill(1, 0, length)
          for (j = 0; j < length; j += 1) {
            if (buf[j] !== 1) {
              ok = false
            }
          }
        }
        expect(ok, method)
      }
    })

    it('.alloc(size, fill) is `fill`-filled', () => {
      expect(safer.Buffer.alloc, safer.Buffer.alloc)
      expect(safer.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (let i = 0; i < 1e2; i += 1) {
        const length = Math.round(Math.random() * 2e6)
        const fill = Math.round(Math.random() * 255)
        const buf = safer.Buffer.alloc(length, fill)
        if (!buffer.Buffer.isBuffer(buf)) {
          ok = false
        }
        if (buf.length !== length) {
          ok = false
        }
        for (let j = 0; j < length; j += 1) {
          if (buf[j] !== fill) {
            ok = false
          }
        }
      }
      expect(ok)
    })

    it('.alloc(size, fill) is `fill`-filled', () => {
      expect(safer.Buffer.alloc, safer.Buffer.alloc)
      expect(safer.Buffer.alloc, dangerous.Buffer.alloc)
      let ok = true
      for (let i = 0; i < 1e2; i += 1) {
        const length = Math.round(Math.random() * 2e6)
        const fill = Math.round(Math.random() * 255)
        const buf = safer.Buffer.alloc(length, fill)
        if (!buffer.Buffer.isBuffer(buf)) {
          ok = false
        }
        if (buf.length !== length) {
          ok = false
        }
        for (let j = 0; j < length; j += 1) {
          if (buf[j] !== fill) {
            ok = false
          }
        }
      }
      expect(ok)
      expect(safer.Buffer.alloc(9, 'a')).toEqual(safer.Buffer.alloc(9, 97))
      expect(safer.Buffer.alloc(9, 'a')).not.toEqual(safer.Buffer.alloc(9, 98))

      const tmp = new buffer.Buffer(2)
      tmp.fill('ok')
      if (tmp[1] === tmp[0]) {
        // Outdated Node.js
        expect(safer.Buffer.alloc(5, 'ok')).toEqual(safer.Buffer.from('ooooo'))
      } else {
        expect(safer.Buffer.alloc(5, 'ok')).toEqual(safer.Buffer.from('okoko'))
      }
      expect(safer.Buffer.alloc(5, 'ok')).not.toEqual(
        safer.Buffer.from('kokok'),
      )
    })

    it('safer.Buffer.from returns results same as Buffer constructor', () => {
      for (const impl of implementations) {
        expect(impl.Buffer.from('')).toEqual(new buffer.Buffer(''))
        expect(impl.Buffer.from('string')).toEqual(new buffer.Buffer('string'))
        expect(impl.Buffer.from('string', 'utf-8')).toEqual(
          new buffer.Buffer('string', 'utf-8'),
        )
        expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64')).toEqual(
          new buffer.Buffer('b25ldHdvdGhyZWU=', 'base64'),
        )
        expect(impl.Buffer.from([0, 42, 3])).toEqual(
          new buffer.Buffer([0, 42, 3]),
        )
        expect(impl.Buffer.from(new Uint8Array([0, 42, 3]))).toEqual(
          new buffer.Buffer(new Uint8Array([0, 42, 3])),
        )
        expect(impl.Buffer.from([])).toEqual(new buffer.Buffer([]))
      }
    })

    it('safer.Buffer.from returns consistent results', () => {
      for (const impl of implementations) {
        expect(impl.Buffer.from('')).toEqual(impl.Buffer.alloc(0))
        expect(impl.Buffer.from([])).toEqual(impl.Buffer.alloc(0))
        expect(impl.Buffer.from(new Uint8Array([]))).toEqual(
          impl.Buffer.alloc(0),
        )
        expect(impl.Buffer.from('string', 'utf-8')).toEqual(
          impl.Buffer.from('string'),
        )
        expect(impl.Buffer.from('string')).toEqual(
          impl.Buffer.from([115, 116, 114, 105, 110, 103]),
        )
        expect(impl.Buffer.from('string')).toEqual(
          impl.Buffer.from(impl.Buffer.from('string')),
        )
        expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64')).toEqual(
          impl.Buffer.from('onetwothree'),
        )
        expect(impl.Buffer.from('b25ldHdvdGhyZWU=')).not.toEqual(
          impl.Buffer.from('onetwothree'),
        )
      }
    })
  },
)
