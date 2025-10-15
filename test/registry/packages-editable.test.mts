/** @fileoverview Tests for editable package.json functionality. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  getEditablePackageJsonClass,
  toEditablePackageJson,
  toEditablePackageJsonSync,
} from '../../registry/dist/lib/packages.js'

describe('toEditablePackageJson', () => {
  it('should convert package.json to editable instance', async () => {
    const pkg = { name: 'test-editable', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = (await toEditablePackageJson(pkg, {
        path: tmpDir,
      })) as InstanceType<typeof _EditablePackageJson>
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-editable')
      expect(editable.content.version).toBe('1.0.0')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle without path option', async () => {
    const pkg = { name: 'test-no-path', version: '1.0.0' }
    const _EditablePackageJson = getEditablePackageJsonClass()
    const editable = (await toEditablePackageJson(pkg)) as InstanceType<
      typeof _EditablePackageJson
    >
    expect(editable).toBeDefined()
    expect(editable.content.name).toBe('test-no-path')
  })

  it('should normalize when normalize option is true', async () => {
    const pkg = { name: 'test-normalize', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = (await toEditablePackageJson(pkg, {
        path: tmpDir,
        normalize: true,
      })) as InstanceType<typeof _EditablePackageJson>
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-normalize')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle dependencies', async () => {
    const pkg = {
      name: 'test-deps',
      version: '1.0.0',
      dependencies: {
        lodash: '^4.17.21',
      },
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = (await toEditablePackageJson(pkg, {
        path: tmpDir,
      })) as InstanceType<typeof _EditablePackageJson>
      expect(editable.content.dependencies).toBeDefined()
      expect(editable.content.dependencies?.['lodash']).toBe('^4.17.21')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle scripts', async () => {
    const pkg = {
      name: 'test-scripts',
      version: '1.0.0',
      scripts: {
        test: 'vitest',
        build: 'tsc',
      },
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = (await toEditablePackageJson(pkg, {
        path: tmpDir,
      })) as InstanceType<typeof _EditablePackageJson>
      expect(editable.content.scripts).toBeDefined()
      expect(editable.content.scripts?.['test']).toBe('vitest')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe('toEditablePackageJsonSync', () => {
  it('should convert package.json to editable instance synchronously', () => {
    const pkg = { name: 'test-editable-sync', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = toEditablePackageJsonSync(pkg, {
        path: tmpDir,
      }) as InstanceType<typeof _EditablePackageJson>
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-editable-sync')
      expect(editable.content.version).toBe('1.0.0')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle without path option', () => {
    const pkg = { name: 'test-no-path-sync', version: '1.0.0' }
    const _EditablePackageJson = getEditablePackageJsonClass()
    const editable = toEditablePackageJsonSync(pkg) as InstanceType<
      typeof _EditablePackageJson
    >
    expect(editable).toBeDefined()
    expect(editable.content.name).toBe('test-no-path-sync')
  })

  it('should normalize when normalize option is true', () => {
    const pkg = { name: 'test-normalize-sync', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = toEditablePackageJsonSync(pkg, {
        path: tmpDir,
        normalize: true,
      }) as InstanceType<typeof _EditablePackageJson>
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-normalize-sync')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle node_modules paths', () => {
    const pkg = { name: 'test-node-modules', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const nodeModulesPath = path.join(tmpDir, 'node_modules', 'test-package')
    fs.mkdirSync(nodeModulesPath, { recursive: true })

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = toEditablePackageJsonSync(pkg, {
        path: nodeModulesPath,
        normalize: true,
      }) as InstanceType<typeof _EditablePackageJson>
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-node-modules')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should preserve repository for non-node_modules paths', () => {
    const pkg = {
      name: 'test-repository',
      version: '1.0.0',
      repository: 'github:user/repo',
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const _EditablePackageJson = getEditablePackageJsonClass()
      const editable = toEditablePackageJsonSync(pkg, {
        path: tmpDir,
        normalize: true,
      }) as InstanceType<typeof _EditablePackageJson>
      expect(editable).toBeDefined()
      expect(editable.content.repository).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe('EditablePackageJson static methods', () => {
  it('should create package.json with static create method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.create(tmpDir)
      expect(editable).toBeDefined()
      expect(editable.content).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should load existing package.json with static load method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-load', version: '1.0.0' }),
    )

    try {
      const editable = await _EditablePackageJson.load(tmpDir)
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-load')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should normalize package.json with static normalize method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-normalize', version: '1.0.0' }),
    )

    try {
      const editable = await _EditablePackageJson.normalize(tmpDir)
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-normalize')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should prepare package.json with static prepare method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-prepare', version: '1.0.0' }),
    )

    try {
      const editable = await _EditablePackageJson.prepare(tmpDir, {})
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-prepare')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle fix method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-fix', version: '1.0.0' }),
    )

    try {
      const editable = await _EditablePackageJson.load(tmpDir)
      await editable.fix()
      expect(editable.content.name).toBe('test-fix')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle load with create option', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.load(tmpDir, { create: true })
      expect(editable).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle load when package.json is missing but not creating', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      await expect(_EditablePackageJson.load(tmpDir)).rejects.toThrow()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle create with data option', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.create(tmpDir, {
        data: { name: 'test-create-data', version: '1.0.0' },
      })
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-create-data')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe('EditablePackageJson instance methods', () => {
  it('should update package.json content', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.create(tmpDir)
      editable.update({ name: 'updated-name', version: '2.0.0' })
      expect(editable.content.name).toBe('updated-name')
      expect(editable.content.version).toBe('2.0.0')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should save package.json to disk', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.create(tmpDir)
      editable.update({ name: 'test-save', version: '1.0.0' })
      const saved = await editable.save()
      expect(saved).toBe(true)
      const pkgPath = path.join(tmpDir, 'package.json')
      expect(fs.existsSync(pkgPath)).toBe(true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should saveSync package.json to disk', () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = new _EditablePackageJson().create(tmpDir)
      editable.update({ name: 'test-save-sync', version: '1.0.0' })
      const saved = editable.saveSync()
      expect(saved).toBe(true)
      const pkgPath = path.join(tmpDir, 'package.json')
      expect(fs.existsSync(pkgPath)).toBe(true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle willSave method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.create(tmpDir)
      editable.update({ name: 'test-will-save', version: '1.0.0' })
      const willSave = editable.willSave()
      expect(typeof willSave).toBe('boolean')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle save with sort option', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await _EditablePackageJson.create(tmpDir)
      editable.update({
        name: 'test-sort',
        version: '1.0.0',
        description: 'Test',
      })
      await editable.save({ sort: true })
      const pkgPath = path.join(tmpDir, 'package.json')
      const content = fs.readFileSync(pkgPath, 'utf8')
      expect(content).toContain('test-sort')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle save with ignoreWhitespace option', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-whitespace', version: '1.0.0' }),
    )

    try {
      const editable = await _EditablePackageJson.load(tmpDir)
      const saved = await editable.save({ ignoreWhitespace: true })
      expect(typeof saved).toBe('boolean')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle fromJSON method', () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const editable = new _EditablePackageJson()
    const json = JSON.stringify({ name: 'test-from-json', version: '1.0.0' })
    editable.fromJSON(json)
    expect(editable.content.name).toBe('test-from-json')
  })

  it('should handle fromContent method', () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const editable = new _EditablePackageJson()
    editable.fromContent({ name: 'test-from-content', version: '1.0.0' })
    expect(editable.content.name).toBe('test-from-content')
  })

  it('should handle prepare method', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-prepare-instance', version: '1.0.0' }),
    )

    try {
      const editable = await _EditablePackageJson.load(tmpDir)
      await editable.prepare()
      expect(editable.content.name).toBe('test-prepare-instance')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should throw error when saving without _canSave', async () => {
    const _EditablePackageJson = getEditablePackageJsonClass()
    const editable = new _EditablePackageJson()
    editable.fromContent({ name: 'test-no-save', version: '1.0.0' })

    await expect(editable.save()).rejects.toThrow('No package.json to save to')
  })
})
