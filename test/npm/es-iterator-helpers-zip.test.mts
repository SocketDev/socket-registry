import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createNpmFallbackLoader } from '../util/npm-fallback.mts'
import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
  { package: 'es-iterator-helpers' },
)
const fallbackLoad = createNpmFallbackLoader({ disabledPaths: ['Iterator'] })

describe.each(['entry', 'fallback'])(
  `${eco} > ${sockRegPkgName} > joint > %s`,
  { skip },
  mode => {
    function loadSub(subPath: string) {
      if (skip) {
        return undefined
      }
      return mode === 'entry'
        ? require(path.join(pkgPath, subPath))
        : fallbackLoad(
            require.resolve(path.join(pkgPath, subPath, 'implementation.js')),
          )
    }
    describe('joint iteration', () => {
      it('concatenates empty and nonempty iterables in order', () => {
        expect(
          Array.from(loadSub('Iterator.concat')([], [1, 2], [], [3])),
        ).toEqual([1, 2, 3])
      })
      it('zips to the shortest source by default', () => {
        expect(
          Array.from(loadSub('Iterator.zip')([[1, 2], ['first']])),
        ).toEqual([[1, 'first']])
      })
      it('pads the longest zip and rejects unequal strict sources', () => {
        const zip = loadSub('Iterator.zip')
        expect(
          Array.from(
            zip([[1, 2], ['first']], {
              mode: 'longest',
              padding: [0, 'missing'],
            }),
          ),
        ).toEqual([
          [1, 'first'],
          [2, 'missing'],
        ])
        expect(() =>
          Array.from(zip([[1, 2], ['first']], { mode: 'strict' })),
        ).toThrow()
      })
      it.each(['shortest', 'strict', 'longest'])(
        'keeps %s zip completed after exhaustion',
        zipMode => {
          const zipped = loadSub('Iterator.zip')([[1], [2]], { mode: zipMode })
          expect(zipped.next()).toEqual({ value: [1, 2], done: false })
          expect(zipped.next()).toEqual({ value: undefined, done: true })
          expect(zipped.next()).toEqual({ value: undefined, done: true })
        },
      )
      it('closes remaining sources at shortest exhaustion and stays completed after return', () => {
        let closed = 0
        function* values() {
          try {
            yield 1
            yield 2
          } finally {
            closed += 1
          }
        }
        const zip = loadSub('Iterator.zip')
        expect(Array.from(zip([values(), [3]]))).toEqual([[1, 3]])
        expect(closed).toBe(1)
        const zipped = zip([values(), [3, 4]])
        zipped.next()
        expect(zipped.return()).toEqual({ value: undefined, done: true })
        expect(zipped.next()).toEqual({ value: undefined, done: true })
        expect(closed).toBe(2)
      })
      it.each([0, false, null, undefined])(
        'preserves falsy next failures (%s) while closing other sources',
        failure => {
          let closed = 0
          function* values() {
            try {
              yield 1
              yield 2
            } finally {
              closed += 1
            }
          }
          const source = {
            [Symbol.iterator]() {
              return this
            },
            next() {
              throw failure
            },
          }
          const zipped = loadSub('Iterator.zip')([values(), source])
          let caught = false
          try {
            zipped.next()
          } catch (error) {
            caught = true
            expect(error).toBe(failure)
          }
          expect(caught).toBe(true)
          expect(closed).toBe(1)
          expect(zipped.next().done).toBe(true)
        },
      )
      it.each([0, false, null, undefined])(
        'preserves falsy return failures (%s) and closes every source',
        failure => {
          const closed: string[] = []
          function source(name: string, thrown: unknown) {
            return {
              [Symbol.iterator]() {
                return this
              },
              next() {
                return { value: 1, done: false }
              },
              return() {
                closed.push(name)
                throw thrown
              },
            }
          }
          const zipped = loadSub('Iterator.zip')([
            source('first', new Error('secondary failure')),
            source('second', failure),
          ])
          zipped.next()
          let caught = false
          try {
            zipped.return()
          } catch (error) {
            caught = true
            expect(error).toBe(failure)
          }
          expect(caught).toBe(true)
          expect(closed).toEqual(['second', 'first'])
          expect(zipped.next().done).toBe(true)
        },
      )
      it('does not close exhausted sources when later strict validation fails', () => {
        let closed = 0
        const exhausted = {
          [Symbol.iterator]() {
            return this
          },
          next() {
            return { value: undefined, done: true }
          },
          return() {
            closed += 1
            return { value: undefined, done: true }
          },
        }
        expect(() =>
          Array.from(
            loadSub('Iterator.zip')([[], exhausted, [1]], { mode: 'strict' }),
          ),
        ).toThrow()
        expect(closed).toBe(0)
      })
      it('finishes empty and equal strict sources without a padding row', () => {
        const zip = loadSub('Iterator.zip')
        expect(Array.from(zip([[], []], { mode: 'longest' }))).toEqual([])
        expect(Array.from(zip([[1], [2]], { mode: 'strict' }))).toEqual([
          [1, 2],
        ])
        expect(() => Array.from(zip([[], [2]], { mode: 'strict' }))).toThrow()
      })

      it('zips keyed sources with padding while ignoring undefined sources', () => {
        const zip = loadSub('Iterator.zipKeyed')
        expect(
          Array.from(
            zip(
              { number: [1, 2], word: ['first'], ignored: undefined },
              { mode: 'longest', padding: { word: 'missing' } },
            ),
          ),
        ).toEqual([
          { number: 1, word: 'first' },
          { number: 2, word: 'missing' },
        ])
      })
    })
  },
)
