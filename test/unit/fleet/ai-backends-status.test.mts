import { describe, expect, it } from 'vitest'

import {
  parseRequired,
  summarizeAiBackends,
} from '../../../scripts/fleet/ai-backends-status.mts'

import type { BackendProbe } from '../../../scripts/fleet/ai-backends-status.mts'

function makeProbe(overrides?: Partial<BackendProbe>): BackendProbe {
  return {
    anthropicKeyed: true,
    codexAuthed: true,
    installed: new Set(['claude', 'codex', 'kimi', 'opencode']),
    opencodeProviders: new Set(['fireworks', 'synthetic']),
    ...overrides,
  }
}

describe('summarizeAiBackends', () => {
  it('reports every backend ready (no fixes) when fully provisioned', () => {
    const statuses = summarizeAiBackends(makeProbe())
    expect(statuses.map(s => s.key)).toStrictEqual([
      'anthropic',
      'codex',
      'fireworks',
      'synthetic',
    ])
    expect(statuses.every(s => s.ready)).toBe(true)
    expect(statuses.every(s => s.fix === undefined)).toBe(true)
  })

  it('flags codex unready with a login fix when authed but the CLI is absent', () => {
    const statuses = summarizeAiBackends(
      makeProbe({ installed: new Set(['claude', 'opencode']) }),
    )
    const codex = statuses.find(s => s.key === 'codex')!
    expect(codex.ready).toBe(false)
    expect(codex.fix).toContain('install the codex CLI')
  })

  it('flags codex unready with `codex login` when the CLI is present but unauthed', () => {
    const statuses = summarizeAiBackends(makeProbe({ codexAuthed: false }))
    const codex = statuses.find(s => s.key === 'codex')!
    expect(codex.ready).toBe(false)
    expect(codex.fix).toBe('codex login')
  })

  it('flags an opencode provider unready with an `opencode auth login` fix', () => {
    const statuses = summarizeAiBackends(
      makeProbe({ opencodeProviders: new Set(['fireworks']) }),
    )
    const fireworks = statuses.find(s => s.key === 'fireworks')!
    const synthetic = statuses.find(s => s.key === 'synthetic')!
    expect(fireworks.ready).toBe(true)
    expect(synthetic.ready).toBe(false)
    expect(synthetic.fix).toContain('opencode auth login')
  })

  it('directs both opencode providers to install opencode when it is absent', () => {
    const statuses = summarizeAiBackends(
      makeProbe({
        installed: new Set(['claude', 'codex']),
        opencodeProviders: new Set(),
      }),
    )
    for (const key of ['fireworks', 'synthetic']) {
      const s = statuses.find(x => x.key === key)!
      expect(s.ready).toBe(false)
      expect(s.fix).toContain('install opencode')
    }
  })
})

describe('parseRequired', () => {
  it('parses repeated and comma-joined --require values', () => {
    const required = parseRequired([
      '--require',
      'codex,fireworks',
      '--require',
      'synthetic',
    ])
    expect([...required].toSorted()).toStrictEqual([
      'codex',
      'fireworks',
      'synthetic',
    ])
  })

  it('returns an empty set when --require is absent', () => {
    expect(parseRequired([]).size).toBe(0)
    expect(parseRequired(['--other', 'x']).size).toBe(0)
  })
})
