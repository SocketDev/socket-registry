/**
 * @file Tests for @socketregistry/json-stable-stringify npm package override.
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
)

describe(
  `${eco} > ${sockRegPkgName}`,
  {
    skip,
  },
  () => {
    const pkgRequireIndexJsPath = `${pkgPath}/index.js`
    const jsonStableStringifyModule = skip
      ? undefined
      : require(pkgRequireIndexJsPath)

    const rawJSON: ((_str: string) => { rawJSON: string }) | undefined = (
      JSON as unknown as {
        rawJSON?: ((_str: string) => { rawJSON: string }) | undefined
      }
    ).rawJSON

    const SUPPORTS_JSON_RAW_JSON = typeof rawJSON === 'function'

    for (const methodName of [
      'stableStringifyRecursive',
      'stableStringifyNonRecursive',
    ]) {
      it(`${methodName}: space parameter (nested objects)`, () => {
        const obj = { one: 1, two: { b: 4, a: [2, 3] } }
        expect(jsonStableStringifyModule(obj, { space: '  ' })).toBe(
          '' +
            '{\n' +
            '  "one": 1,\n' +
            '  "two": {\n' +
            '    "a": [\n' +
            '      2,\n' +
            '      3\n' +
            '    ],\n' +
            '    "b": 4\n' +
            '  }\n' +
            '}',
        )
      })

      it(`${methodName}: space parameter (same as native)`, () => {
        // For this test, properties need to be in alphabetical order.
        const obj = { one: 1, two: { a: [2, 3], b: 4 } }
        expect(jsonStableStringifyModule(obj, { space: '  ' })).toBe(
          JSON.stringify(obj, null, '  '),
        )
      })

      it(`${methodName}: space parameter base empty behavior: empty arrays and objects have added newline and space`, () => {
        const obj = { emptyArr: [], emptyObj: {} }
        expect(jsonStableStringifyModule(obj, { space: '  ' })).toBe(
          '{\n  "emptyArr": [\n  ],\n  "emptyObj": {\n  }\n}',
        )
      })

      it(`${methodName}: space parameter, with collapseEmpty: true`, () => {
        const obj = { emptyArr: [], emptyObj: {} }
        expect(() => {
          jsonStableStringifyModule(obj, { collapseEmpty: 'not a boolean' })
        }).toThrow(TypeError)
        expect(
          jsonStableStringifyModule(obj, { collapseEmpty: true, space: '  ' }),
        ).toBe('{\n  "emptyArr": [],\n  "emptyObj": {}\n}')
      })

      it(`${methodName}: space omits object values with no JSON representation`, () => {
        const obj = {
          a: 1,
          b: undefined,
          c: Math.max,
          d: Symbol.iterator,
          e: 2,
        }
        const actual = jsonStableStringifyModule(obj, { space: '  ' })
        expect(actual).toBe('{\n  "a": 1,\n  "e": 2\n}')
        expect(actual).toBe(JSON.stringify(obj, null, '  '))
        expect(JSON.parse(actual)).toStrictEqual({ a: 1, e: 2 })
      })

      it(`${methodName}: space serializes unrepresentable array elements as null`, () => {
        const arr = [1, undefined, Math.max, Symbol.iterator, 2]
        const actual = jsonStableStringifyModule(arr, { space: '  ' })
        expect(actual).toBe(JSON.stringify(arr, null, '  '))
        expect(JSON.parse(actual)).toStrictEqual([1, null, null, null, 2])
      })

      it(`${methodName}: space returns undefined for an unrepresentable root`, () => {
        expect(
          jsonStableStringifyModule(undefined, { space: '  ' }),
        ).toBeUndefined()
        expect(jsonStableStringifyModule(Math.max, { space: '  ' })).toBe(
          undefined,
        )
      })

      it(`${methodName}: space renders an all-omitted object as empty`, () => {
        const obj = { a: { b: undefined, c: Math.max } }
        expect(jsonStableStringifyModule(obj, { space: '  ' })).toBe(
          '{\n  "a": {\n  }\n}',
        )
        expect(
          jsonStableStringifyModule(obj, { collapseEmpty: true, space: '  ' }),
        ).toBe(JSON.stringify(obj, null, '  '))
      })

      it(`${methodName}: omits unrepresentable values without space`, () => {
        const obj = { a: 1, b: undefined, c: Math.max, e: 2 }
        expect(jsonStableStringifyModule(obj)).toBe('{"a":1,"e":2}')
        expect(jsonStableStringifyModule(obj, { cycles: true })).toBe(
          '{"a":1,"e":2}',
        )
        expect(jsonStableStringifyModule([1, undefined, 2])).toBe('[1,null,2]')
        expect(
          jsonStableStringifyModule([1, undefined, 2], { cycles: true }),
        ).toBe('[1,null,2]')
      })

      it(
        `${methodName}: supports JSON.rawJSON`,
        { skip: !SUPPORTS_JSON_RAW_JSON || !jsonStableStringifyModule },
        () => {
          // Test case from MDN example:
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/isRawJSON#examples
          expect(
            jsonStableStringifyModule({
              name: 'Josh',
              userId: rawJSON?.('12345678901234567890'),
              friends: [
                { name: 'Alice', userId: rawJSON?.('9876543210987654321') },
                { name: 'Bob', userId: rawJSON?.('56789012345678901234') },
              ],
            }),
          ).toBe(
            '{"friends":[{"name":"Alice","userId":9876543210987654321},{"name":"Bob","userId":56789012345678901234}],"name":"Josh","userId":12345678901234567890}',
          )
        },
      )

      // This test must be last because it triggers the internal switch from
      // stableStringifyRecursive to stableStringifyNonRecursive.
      it(`${methodName}: can handle exceeding call stack limits`, () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        function createCallStackBusterObject() {
          let obj = {}
          let limit = 0
          const result = obj
          try {
            ;(function r() {
              limit += 1
              const newObj = {}
              ;(obj as Record<string, unknown>)[`prop${limit}`] = newObj
              obj = newObj
              r()
            })()
          } catch {}
          return result
        }
        expect(() =>
          jsonStableStringifyModule(createCallStackBusterObject()),
        ).not.toThrow()
      })
    }

    it('applies toJSON on the default path', () => {
      expect(jsonStableStringifyModule(new Date(0))).toBe(
        '"1970-01-01T00:00:00.000Z"',
      )
      expect(jsonStableStringifyModule({ d: new Date(0) })).toBe(
        '{"d":"1970-01-01T00:00:00.000Z"}',
      )
      expect(jsonStableStringifyModule({ b: Buffer.from('hi') })).toBe(
        '{"b":{"data":[104,105],"type":"Buffer"}}',
      )
    })

    it('preserves an own __proto__ key', () => {
      expect(
        jsonStableStringifyModule(JSON.parse('{"a":1,"__proto__":{"p":true}}')),
      ).toBe('{"__proto__":{"p":true},"a":1}')
      expect(
        jsonStableStringifyModule(
          JSON.parse('{"a":1,"__proto__":{"p":true}}'),
          { space: '  ' },
        ),
      ).toBe('{\n  "__proto__": {\n    "p": true\n  },\n  "a": 1\n}')
    })

    it('applies the replacer once per node with the holder as this', () => {
      const inc = (_k: string, v: unknown) =>
        typeof v === 'number' ? v + 1 : v
      expect(
        jsonStableStringifyModule({ a: { b: { c: 1 } } }, { replacer: inc }),
      ).toBe('{"a":{"b":{"c":2}}}')
      expect(
        jsonStableStringifyModule({ a: { b: 1 } }, { replacer: inc }),
      ).toBe(JSON.stringify({ a: { b: 1 } }, inc))

      const holders: unknown[] = []
      function capture(this: unknown, _k: string, v: unknown) {
        holders.push(this)
        return v
      }
      const obj = { x: 1 }
      jsonStableStringifyModule(obj, { replacer: capture })
      expect(holders[0]).toStrictEqual({ '': obj })
      expect(holders[1]).toBe(obj)
    })

    it('sorts integer-like keys lexicographically like upstream', () => {
      expect(jsonStableStringifyModule({ 10: 'a', 2: 'b' })).toBe(
        '{"10":"a","2":"b"}',
      )
      expect(
        jsonStableStringifyModule(
          { 10: 'a', 2: 'b' },
          {
            cmp: (a: { key: string }, b: { key: string }) =>
              b.key.localeCompare(a.key),
          },
        ),
      ).toBe('{"2":"b","10":"a"}')
    })

    it('honors toJSON and __proto__ beyond the recursion limit', () => {
      let deep: Record<string, unknown> = JSON.parse(
        '{"__proto__":{"p":true},"d":null}',
      )
      deep['d'] = new Date(0)
      const leaf = deep
      for (let i = 0; i < 200_000; i += 1) {
        deep = { a: deep }
      }
      const out = jsonStableStringifyModule(deep) as string
      expect(out.endsWith('}'.repeat(200_001))).toBe(true)
      expect(out).toContain('"d":"1970-01-01T00:00:00.000Z"')
      expect(out).toContain('"__proto__":{"p":true}')
      expect(JSON.stringify(leaf)).toContain('"__proto__":{"p":true}')
    })
  },
)
