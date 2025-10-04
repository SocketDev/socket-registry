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
      const editable = await toEditablePackageJson(pkg, { path: tmpDir })
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-editable')
      expect(editable.content.version).toBe('1.0.0')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle without path option', async () => {
    const pkg = { name: 'test-no-path', version: '1.0.0' }
    const editable = await toEditablePackageJson(pkg)
    expect(editable).toBeDefined()
    expect(editable.content.name).toBe('test-no-path')
  })

  it('should normalize when normalize option is true', async () => {
    const pkg = { name: 'test-normalize', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await toEditablePackageJson(pkg, {
        path: tmpDir,
        normalize: true,
      })
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
      const editable = await toEditablePackageJson(pkg, { path: tmpDir })
      expect(editable.content.dependencies).toBeDefined()
      expect(editable.content.dependencies.lodash).toBe('^4.17.21')
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
      const editable = await toEditablePackageJson(pkg, { path: tmpDir })
      expect(editable.content.scripts).toBeDefined()
      expect(editable.content.scripts.test).toBe('vitest')
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
      const editable = toEditablePackageJsonSync(pkg, { path: tmpDir })
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-editable-sync')
      expect(editable.content.version).toBe('1.0.0')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle without path option', () => {
    const pkg = { name: 'test-no-path-sync', version: '1.0.0' }
    const editable = toEditablePackageJsonSync(pkg)
    expect(editable).toBeDefined()
    expect(editable.content.name).toBe('test-no-path-sync')
  })

  it('should normalize when normalize option is true', () => {
    const pkg = { name: 'test-normalize-sync', version: '1.0.0' }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = toEditablePackageJsonSync(pkg, {
        path: tmpDir,
        normalize: true,
      })
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
      const editable = toEditablePackageJsonSync(pkg, {
        path: nodeModulesPath,
        normalize: true,
      })
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
      const editable = toEditablePackageJsonSync(pkg, {
        path: tmpDir,
        normalize: true,
      })
      expect(editable).toBeDefined()
      expect(editable.content.repository).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe('EditablePackageJson static methods', () => {
  it('should create package.json with static create method', async () => {
    const EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await EditablePackageJson.create(tmpDir)
      expect(editable).toBeDefined()
      expect(editable.content).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should load existing package.json with static load method', async () => {
    const EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-load', version: '1.0.0' }),
    )

    try {
      const editable = await EditablePackageJson.load(tmpDir)
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-load')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should normalize package.json with static normalize method', async () => {
    const EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-normalize', version: '1.0.0' }),
    )

    try {
      const editable = await EditablePackageJson.normalize(tmpDir)
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-normalize')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should prepare package.json with static prepare method', async () => {
    const EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-prepare', version: '1.0.0' }),
    )

    try {
      const editable = await EditablePackageJson.prepare(tmpDir, {})
      expect(editable).toBeDefined()
      expect(editable.content.name).toBe('test-prepare')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle fix method', async () => {
    const EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'test-fix', version: '1.0.0' }),
    )

    try {
      const editable = await EditablePackageJson.load(tmpDir)
      await editable.fix()
      expect(editable.content.name).toBe('test-fix')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('should handle load with create option', async () => {
    const EditablePackageJson = getEditablePackageJsonClass()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

    try {
      const editable = await EditablePackageJson.load(tmpDir, { create: true })
      expect(editable).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
