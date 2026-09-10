import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'
import { printActionDependencyTree } from '../../../../scripts/repo/ci/show-actions-tree.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('ci/show-actions-tree.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm generate-actions-tree')
})

it('sorts files and retains continuation branches for direct and transitive actions', () => {
  const lines: string[] = []
  printActionDependencyTree(
    new Map([
      [
        '.github/workflows/verify.yml',
        [{ action: 'example-org/verify', transitives: [] }],
      ],
      [
        '.github/actions/build/action.yml',
        [
          {
            action: 'example-org/build',
            transitives: ['example-org/first', 'example-org/second'],
          },
          {
            action: 'example-org/upload',
            transitives: ['example-org/storage'],
          },
        ],
      ],
    ]),
    line => lines.push(line),
  )
  expect(lines).toEqual([
    '  ├─ actions/build/action.yml',
    '  │  ├─ example-org/build',
    '  │  │  ├─ example-org/first',
    '  │  │  └─ example-org/second',
    '  │  └─ example-org/upload',
    '  │     └─ example-org/storage',
    '  └─ workflows/verify.yml',
    '     └─ example-org/verify',
  ])
})
