// vitest specs for check-skills-are-well-formed — the pure SKILL.md structure
// validators (extractFrontmatter / frontmatterValue / classifySkill).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  classifySkill,
  extractFrontmatter,
  findSkillDefects,
  frontmatterValue,
} from '../../../scripts/fleet/check/skills-are-well-formed.mts'

function tmpSkillsDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'skills-wf-'))
}

function writeSkill(skillsDir: string, name: string, body: string): void {
  mkdirSync(path.join(skillsDir, name), { recursive: true })
  writeFileSync(path.join(skillsDir, name, 'SKILL.md'), body)
}

describe('extractFrontmatter', () => {
  test('returns the frontmatter block', () => {
    const fm = extractFrontmatter(
      '---\nname: foo\ndescription: bar\n---\n# body\n',
    )
    assert.ok(fm?.includes('name: foo'))
    assert.ok(fm?.includes('description: bar'))
  })
  test('undefined when no leading ---', () => {
    assert.equal(extractFrontmatter('# just a body\n'), undefined)
  })
  test('undefined when unterminated', () => {
    assert.equal(extractFrontmatter('---\nname: foo\nno close\n'), undefined)
  })
})

describe('frontmatterValue', () => {
  test('reads a top-level scalar, stripping quotes', () => {
    assert.equal(frontmatterValue('name: foo\ndescription: x', 'name'), 'foo')
    assert.equal(frontmatterValue("name: 'foo'", 'name'), 'foo')
  })
  test('undefined for a missing key', () => {
    assert.equal(frontmatterValue('name: foo', 'model'), undefined)
  })
})

describe('classifySkill', () => {
  test('well-formed skill → no defect', () => {
    const d = tmpSkillsDir()
    writeSkill(
      d,
      'doing-things',
      '---\nname: doing-things\ndescription: does the thing\n---\n',
    )
    assert.equal(classifySkill(d, 'doing-things'), undefined)
  })

  test('no SKILL.md → no-skill-md (the tidying-files bug shape)', () => {
    const d = tmpSkillsDir()
    mkdirSync(path.join(d, 'half-built', 'lib'), { recursive: true })
    writeFileSync(
      path.join(d, 'half-built', 'lib', 'engine.mts'),
      '// engine\n',
    )
    assert.equal(classifySkill(d, 'half-built')?.reason, 'no-skill-md')
  })

  test('no frontmatter → no-frontmatter', () => {
    const d = tmpSkillsDir()
    writeSkill(d, 'bare', '# just a heading, no frontmatter\n')
    assert.equal(classifySkill(d, 'bare')?.reason, 'no-frontmatter')
  })

  test('name mismatch → name-mismatch', () => {
    const d = tmpSkillsDir()
    writeSkill(d, 'real-name', '---\nname: wrong-name\ndescription: x\n---\n')
    assert.equal(classifySkill(d, 'real-name')?.reason, 'name-mismatch')
  })

  test('missing description → no-description', () => {
    const d = tmpSkillsDir()
    writeSkill(d, 'no-desc', '---\nname: no-desc\n---\n')
    assert.equal(classifySkill(d, 'no-desc')?.reason, 'no-description')
  })
})

describe('findSkillDefects', () => {
  test('skips _shared and reports only defective dirs', () => {
    const d = tmpSkillsDir()
    writeSkill(d, 'good', '---\nname: good\ndescription: fine\n---\n')
    mkdirSync(path.join(d, '_shared'), { recursive: true })
    writeFileSync(path.join(d, '_shared', 'lib.mts'), '// shared\n')
    mkdirSync(path.join(d, 'broken'), { recursive: true })
    const defects = findSkillDefects(d)
    assert.equal(defects.length, 1)
    assert.equal(defects[0]!.name, 'broken')
  })
})
