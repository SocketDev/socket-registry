// vitest specs for the cleanOutput / stripDecoration test helpers.

import { expect, test } from 'vitest'

import {
  cleanOutput,
  stripDecoration,
} from '../../_shared/fleet/lib/output.mts'

const ESC = String.fromCharCode(27)

test('cleanOutput strips ANSI color escapes and trims', () => {
  const styled = `  ${ESC}[32m✔ done${ESC}[39m  \n`
  expect(cleanOutput(styled)).toBe('✔ done')
})

test('cleanOutput strips decorative banner glyphs', () => {
  expect(cleanOutput('⚡ Building Package')).toBe('Building Package')
  expect(cleanOutput('✧ sparkle')).toBe('sparkle')
})

test('cleanOutput leaves plain text untouched apart from trim', () => {
  expect(cleanOutput('  hello world  ')).toBe('hello world')
})

test('stripDecoration removes escapes but preserves surrounding whitespace', () => {
  const styled = `  ${ESC}[1mindented${ESC}[22m  `
  expect(stripDecoration(styled)).toBe('  indented  ')
})
