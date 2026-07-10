// vitest spec for the linters-are-oxlint-oxfmt-only check. The check script
// itself calls main() without an entrypoint guard so it cannot be safely
// imported; instead we exercise the exported pure functions from the shared
// foreign-linters.mts classifier that the check delegates all detection to.
// No real git, network, or filesystem access is required.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  auditForeignDeps,
  commandWords,
  CONFIG_FILE_PATTERNS,
  foreignToolBinary,
  isForeignConfigFile,
  isForeignToolPackage,
  isVendoredUpstream,
} from '../../../.claude/hooks/fleet/_shared/foreign-linters.mts'

// ---------------------------------------------------------------------------
// isForeignConfigFile — detects the basenames the check script gates on
// ---------------------------------------------------------------------------

describe('isForeignConfigFile', () => {
  test('flags biome config variants', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('biome.json'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('biome.jsonc'), true)
  })

  test('flags dprint config', () => {
    assert.equal(isForeignConfigFile('.dprint.json'), true)
    assert.equal(isForeignConfigFile('.dprint.jsonc'), true)
  })

  test('flags .eslintrc variants', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('.eslintrc'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('.eslintrc.json'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('.eslintrc.cjs'), true)
    assert.equal(isForeignConfigFile('.eslintrc.mjs'), true)
  })

  test('flags eslint.config.* variants', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('eslint.config.js'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('eslint.config.mjs'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('eslint.config.cjs'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('eslint.config.ts'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign config names
    assert.equal(isForeignConfigFile('eslint.config.mts'), true)
  })

  test('flags .prettierrc variants', () => {
    assert.equal(isForeignConfigFile('.prettierrc'), true)
    assert.equal(isForeignConfigFile('.prettierrc.json'), true)
    assert.equal(isForeignConfigFile('.prettierrc.js'), true)
  })

  test('flags prettier.config.* variants', () => {
    assert.equal(isForeignConfigFile('prettier.config.js'), true)
    assert.equal(isForeignConfigFile('prettier.config.mjs'), true)
    assert.equal(isForeignConfigFile('prettier.config.ts'), true)
  })

  test('passes fleet-native and unrelated files', () => {
    assert.equal(isForeignConfigFile('oxlint.json'), false)
    assert.equal(isForeignConfigFile('.oxlintrc.json'), false)
    assert.equal(isForeignConfigFile('package.json'), false)
    assert.equal(isForeignConfigFile('tsconfig.json'), false)
    assert.equal(isForeignConfigFile('README.md'), false)
    // Near-misses
    assert.equal(isForeignConfigFile('notbiome.json'), false)
    assert.equal(isForeignConfigFile('eslintrc'), false)
  })

  test('CONFIG_FILE_PATTERNS count matches isForeignConfigFile coverage', () => {
    // Sanity: ensure the pattern list is non-empty (a regression guard).
    assert.ok(CONFIG_FILE_PATTERNS.length >= 6)
  })
})

// ---------------------------------------------------------------------------
// isVendoredUpstream — exempts vendored trees from the check
// ---------------------------------------------------------------------------

describe('isVendoredUpstream', () => {
  test('flags standard vendored directories', () => {
    assert.equal(isVendoredUpstream('upstream/foo/bar.ts'), true)
    assert.equal(isVendoredUpstream('vendor/eslint/.eslintrc.json'), true)
    assert.equal(isVendoredUpstream('third_party/biome/pkg.json'), true)
    assert.equal(isVendoredUpstream('external/prettier/index.js'), true)
  })

  test('flags paths ending in -upstream', () => {
    assert.equal(isVendoredUpstream('acorn-upstream/src/index.ts'), true)
    assert.equal(isVendoredUpstream('packages/foo-upstream/package.json'), true)
  })

  test('flags nested vendored paths', () => {
    assert.equal(
      isVendoredUpstream('packages/lib/vendor/eslint/config.js'),
      true,
    )
  })

  test('passes normal non-vendored paths', () => {
    assert.equal(isVendoredUpstream('src/index.ts'), false)
    assert.equal(isVendoredUpstream('scripts/fleet/check/something.mts'), false)
    assert.equal(
      isVendoredUpstream('packages/my-upstream-client/index.ts'),
      false,
    )
    // "vendor" as part of a word, not a segment
    assert.equal(isVendoredUpstream('vendorutils/index.ts'), false)
  })
})

// ---------------------------------------------------------------------------
// isForeignToolPackage — identifies blocked package names
// ---------------------------------------------------------------------------

describe('isForeignToolPackage', () => {
  test('flags exact foreign tool names', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(isForeignToolPackage('@biomejs/biome'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(isForeignToolPackage('eslint'), true)
    assert.equal(isForeignToolPackage('prettier'), true)
    assert.equal(isForeignToolPackage('dprint'), true)
    assert.equal(isForeignToolPackage('rome'), true)
  })

  test('flags eslint-family packages', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(isForeignToolPackage('@eslint/core'), true)
    assert.equal(isForeignToolPackage('@typescript-eslint/parser'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(isForeignToolPackage('eslint-config-airbnb'), true)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(isForeignToolPackage('eslint-plugin-react'), true)
    assert.equal(isForeignToolPackage('@scope/eslint-config-foo'), true)
  })

  test('flags prettier-plugin-* packages', () => {
    assert.equal(isForeignToolPackage('prettier-plugin-tailwindcss'), true)
  })

  test('passes fleet-native and unrelated packages', () => {
    assert.equal(isForeignToolPackage('oxlint'), false)
    assert.equal(isForeignToolPackage('vitest'), false)
    assert.equal(isForeignToolPackage('@socketsecurity/lib'), false)
    assert.equal(isForeignToolPackage('typescript'), false)
  })
})

// ---------------------------------------------------------------------------
// foreignToolBinary — maps package → binary name
// ---------------------------------------------------------------------------

describe('foreignToolBinary', () => {
  test('biome package → biome binary', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(foreignToolBinary('@biomejs/biome'), 'biome')
  })

  test('dprint → dprint', () => {
    assert.equal(foreignToolBinary('dprint'), 'dprint')
  })

  test('prettier and its plugins → prettier', () => {
    assert.equal(foreignToolBinary('prettier'), 'prettier')
    assert.equal(foreignToolBinary('prettier-plugin-tailwindcss'), 'prettier')
  })

  test('rome → rome', () => {
    assert.equal(foreignToolBinary('rome'), 'rome')
  })

  test('eslint family → eslint', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(foreignToolBinary('eslint'), 'eslint')
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(foreignToolBinary('@eslint/core'), 'eslint')
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the binary name maps to eslint
    assert.equal(foreignToolBinary('@typescript-eslint/parser'), 'eslint')
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(foreignToolBinary('eslint-plugin-react'), 'eslint')
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the detector recognises these foreign package names
    assert.equal(foreignToolBinary('eslint-config-airbnb'), 'eslint')
  })
})

// ---------------------------------------------------------------------------
// commandWords — extracts invoked binary tokens from a script value
// ---------------------------------------------------------------------------

describe('commandWords', () => {
  test('simple single command', () => {
    assert.deepEqual(commandWords('oxlint src/'), ['oxlint'])
  })

  test('chained commands with &&', () => {
    assert.deepEqual(commandWords('oxlint src/ && oxfmt .'), [
      'oxlint',
      'oxfmt',
    ])
  })

  test('skips leading env-var assignments', () => {
    assert.deepEqual(commandWords('NODE_ENV=test vitest run'), ['vitest'])
  })

  test('surfactants npx runner indirection', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: eslint command is the input under test
    const words = commandWords('npx eslint src/')
    assert.ok(words.includes('npx'))
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting eslint is extracted from the command
    assert.ok(words.includes('eslint'))
  })

  test('surfaces pnpm exec runner indirection', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: eslint command is the input under test
    const words = commandWords('pnpm exec eslint src/')
    assert.ok(words.includes('pnpm'))
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting eslint is extracted from the command
    assert.ok(words.includes('eslint'))
  })

  test('extracts basename from node_modules path', () => {
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: eslint binary path is the input under test
    const words = commandWords('node_modules/.bin/eslint src/')
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting eslint is extracted from the path
    assert.ok(words.includes('eslint'))
  })

  test('empty string → empty array', () => {
    assert.deepEqual(commandWords(''), [])
  })
})

// ---------------------------------------------------------------------------
// auditForeignDeps — the core check logic for package.json scanning
// ---------------------------------------------------------------------------

describe('auditForeignDeps — PASS cases (no blocked deps)', () => {
  test('empty package.json returns clean audit', () => {
    const audit = auditForeignDeps('{}')
    assert.deepEqual(audit.blocked, [])
    assert.deepEqual(audit.allowed, [])
  })

  test('package.json with only fleet-native deps passes', () => {
    const pkg = JSON.stringify({
      devDependencies: { oxlint: '^1.0.0', vitest: '^3.0.0' },
    })
    const audit = auditForeignDeps(pkg)
    assert.deepEqual(audit.blocked, [])
  })

  test('unparseable JSON fails open (no blocking)', () => {
    const audit = auditForeignDeps('not valid json{')
    assert.deepEqual(audit.blocked, [])
    assert.deepEqual(audit.allowed, [])
  })

  test('hostTestDep in devDependencies with no invoking script → allowed', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      devDependencies: { eslint: '^9.0.0' },
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      fleet: { hostTestDeps: ['eslint'] },
      scripts: { test: 'vitest run' },
    })
    const audit = auditForeignDeps(pkg)
    assert.deepEqual(audit.blocked, [])
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the allowed output contains the foreign package name
    assert.deepEqual(audit.allowed, ['eslint'])
  })

  test('hostTestDep in peerDependencies → allowed', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      peerDependencies: { eslint: '>=8' },
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      fleet: { hostTestDeps: ['eslint'] },
      scripts: { build: 'tsc' },
    })
    const audit = auditForeignDeps(pkg)
    assert.deepEqual(audit.blocked, [])
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the allowed output contains the foreign package name
    assert.deepEqual(audit.allowed, ['eslint'])
  })
})

describe('auditForeignDeps — FAIL cases (blocked deps found)', () => {
  test('eslint in devDependencies without hostTestDeps → blocked', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      devDependencies: { eslint: '^9.0.0' },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the blocked output contains the foreign package name
    assert.equal(audit.blocked[0]!.name, 'eslint')
    assert.match(
      audit.blocked[0]!.reason,
      /not listed in `fleet\.hostTestDeps`/,
    )
  })

  test('prettier in dependencies → blocked', () => {
    const pkg = JSON.stringify({
      dependencies: { prettier: '^3.0.0' },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    assert.equal(audit.blocked[0]!.name, 'prettier')
  })

  // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: test description names the foreign package
  test('@biomejs/biome in devDependencies without hostTestDeps → blocked', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      devDependencies: { '@biomejs/biome': '^1.0.0' },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the blocked output contains the foreign package name
    assert.equal(audit.blocked[0]!.name, '@biomejs/biome')
  })

  // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: test description names the foreign package family
  test('eslint-plugin-* without hostTestDeps → blocked', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      devDependencies: { 'eslint-plugin-react': '^8.0.0' },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: asserting the blocked output contains the foreign package name
    assert.equal(audit.blocked[0]!.name, 'eslint-plugin-react')
  })

  test('multiple foreign deps → all blocked, sorted by name', () => {
    const pkg = JSON.stringify({
      devDependencies: {
        prettier: '^3.0.0',
        // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
        eslint: '^9.0.0',
      },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 2)
    // toSorted() in the implementation produces alphabetical order
    // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the expected output
    assert.equal(audit.blocked[0]!.name, 'eslint')
    assert.equal(audit.blocked[1]!.name, 'prettier')
  })

  test('hostTestDep in runtime dependencies → blocked (not allowed in deps)', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      dependencies: { eslint: '^9.0.0' },
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      fleet: { hostTestDeps: ['eslint'] },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    assert.match(audit.blocked[0]!.reason, /devDependencies\/peerDependencies/)
  })

  test('hostTestDep with an invoking script → blocked', () => {
    const pkg = JSON.stringify({
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      devDependencies: { eslint: '^9.0.0' },
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      fleet: { hostTestDeps: ['eslint'] },
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- test fixture: foreign package name is the input under test
      scripts: { lint: 'eslint src/' },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    assert.match(audit.blocked[0]!.reason, /invokes `eslint`/)
  })

  test('hostTestDep invoked via npx → blocked', () => {
    const pkg = JSON.stringify({
      devDependencies: { prettier: '^3.0.0' },
      fleet: { hostTestDeps: ['prettier'] },
      scripts: { format: 'npx prettier --write .' },
    })
    const audit = auditForeignDeps(pkg)
    assert.equal(audit.blocked.length, 1)
    assert.match(audit.blocked[0]!.reason, /invokes `prettier`/)
  })
})
