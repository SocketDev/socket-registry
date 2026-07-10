// vitest spec for check-markdown-doc-headers-are-plain — the pure
// headerWouldMangle detector. The directory walk (main / findMangledHeaders) is
// exercised by the check running in `check --all`.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import { headerWouldMangle } from '../../../scripts/fleet/check/markdown-doc-headers-are-plain.mts'

describe('markdown-doc-headers-are-plain — headerWouldMangle', () => {
  test('a /** @file */ header with a markdown list IS flagged', () => {
    assert.equal(
      headerWouldMangle('/**\n * @file Foo.\n *\n * - a\n * - b\n */\n'),
      true,
    )
  })

  test('a /** @file */ header with a numbered list IS flagged', () => {
    assert.equal(
      headerWouldMangle('/**\n * @file Foo.\n *\n * 1. step\n */\n'),
      true,
    )
  })

  test('already-plain /* @file */ with the same markdown is NOT flagged', () => {
    assert.equal(
      headerWouldMangle('/*\n * @file Foo.\n *\n * - a\n */\n'),
      false,
    )
  })

  test('a /** @file */ header with NO markdown is NOT flagged', () => {
    assert.equal(
      headerWouldMangle('/**\n * @file Plain prose, no markdown here.\n */\n'),
      false,
    )
  })

  test('a non-@file file-doc header (followed by import) with markdown IS flagged', () => {
    assert.equal(
      headerWouldMangle(
        '/**\n * File doc, no @file tag.\n *\n * 1. one\n */\nimport x from "y"\n',
      ),
      true,
    )
  })

  test('a leading /** that is JSDoc for the next symbol is NOT flagged', () => {
    assert.equal(
      headerWouldMangle(
        '/**\n * Doc for foo.\n * - detail\n */\nexport function foo() {}\n',
      ),
      false,
    )
  })

  test('a /** with markdown that is NOT the leading block is NOT flagged', () => {
    assert.equal(
      headerWouldMangle(
        'const x = 1\n/**\n * later.\n * - item\n */\nfunction g() {}\n',
      ),
      false,
    )
  })

  test('shebang-first @file header with markdown IS flagged', () => {
    assert.equal(
      headerWouldMangle(
        '#!/usr/bin/env node\n/**\n * @file Bar.\n * - x\n */\n',
      ),
      true,
    )
  })
})
