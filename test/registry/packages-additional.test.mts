import { describe, expect, it } from 'vitest'

import type {
  InternalBinaryOperationNode,
  InternalLicenseNode,
} from '../../registry/dist/lib/packages.js'

const {
  createAstNode,
  createBinaryOperationNode,
  createLicenseNode,
  getEditablePackageJsonClass,
  pkgJsonToEditable,
  visitLicenses,
} = require('../../registry/dist/lib/packages')

describe('packages module additional coverage', () => {
  describe('createAstNode', () => {
    it('should create license node for license type', () => {
      const rawNode = { license: 'MIT' }
      const result = createAstNode(rawNode)
      expect(result).toBeDefined()
      expect(result.type).toBe('License')
      expect(result.license).toBe('MIT')
    })

    it('should create binary operation node for operation type', () => {
      const rawNode = {
        left: { license: 'MIT' },
        conjunction: 'AND',
        right: { license: 'Apache-2.0' },
      }
      const result = createAstNode(rawNode)
      expect(result).toBeDefined()
      expect(result.type).toBe('BinaryOperation')
    })

    it('should handle complex nested operations', () => {
      const rawNode = {
        left: {
          left: { license: 'MIT' },
          conjunction: 'OR',
          right: { license: 'BSD-3-Clause' },
        },
        conjunction: 'AND',
        right: { license: 'Apache-2.0' },
      }
      const result = createAstNode(rawNode)
      expect(result).toBeDefined()
      expect(result.type).toBe('BinaryOperation')
    })
  })

  describe('createBinaryOperationNode', () => {
    it('should create binary operation node', () => {
      const rawNode = {
        left: { license: 'MIT' },
        conjunction: 'AND',
        right: { license: 'Apache-2.0' },
      }
      const result = createBinaryOperationNode(rawNode)
      expect(result).toBeDefined()
      expect(result.conjunction).toBe('AND')
    })

    it('should lazily evaluate left node', () => {
      const rawNode = {
        left: { license: 'MIT' },
        conjunction: 'OR',
        right: { license: 'Apache-2.0' },
      }
      const result = createBinaryOperationNode(rawNode)
      expect(result.left).toBeDefined()
      expect(result.left.license).toBe('MIT')
    })

    it('should lazily evaluate right node', () => {
      const rawNode = {
        left: { license: 'MIT' },
        conjunction: 'OR',
        right: { license: 'Apache-2.0' },
      }
      const result = createBinaryOperationNode(rawNode)
      expect(result.right).toBeDefined()
      expect(result.right.license).toBe('Apache-2.0')
    })

    it('should handle nested operations in left', () => {
      const rawNode = {
        left: {
          left: { license: 'MIT' },
          conjunction: 'OR',
          right: { license: 'BSD-3-Clause' },
        },
        conjunction: 'AND',
        right: { license: 'Apache-2.0' },
      }
      const result = createBinaryOperationNode(rawNode)
      expect(result.left.type).toBe('BinaryOperation')
    })

    it('should handle nested operations in right', () => {
      const rawNode = {
        left: { license: 'MIT' },
        conjunction: 'AND',
        right: {
          left: { license: 'Apache-2.0' },
          conjunction: 'OR',
          right: { license: 'BSD-3-Clause' },
        },
      }
      const result = createBinaryOperationNode(rawNode)
      expect(result.right.type).toBe('BinaryOperation')
    })
  })

  describe('createLicenseNode', () => {
    it('should create license node', () => {
      const rawNode = { license: 'MIT' }
      const result = createLicenseNode(rawNode)
      expect(result).toBeDefined()
      expect(result.type).toBe('License')
      expect(result.license).toBe('MIT')
    })

    it('should handle license with exception', () => {
      const rawNode = { license: 'Apache-2.0', exception: 'LLVM-exception' }
      const result = createLicenseNode(rawNode)
      expect(result.license).toBe('Apache-2.0')
      expect(result.exception).toBe('LLVM-exception')
    })

    it('should handle license with plus', () => {
      const rawNode = { license: 'GPL-3.0', plus: true }
      const result = createLicenseNode(rawNode)
      expect(result.license).toBe('GPL-3.0')
      expect(result.plus).toBe(true)
    })

    it('should handle license with inFile', () => {
      const rawNode = {
        license: 'SEE LICENSE IN LICENSE.txt',
        inFile: 'LICENSE.txt',
      }
      const result = createLicenseNode(rawNode)
      expect(result.license).toBe('SEE LICENSE IN LICENSE.txt')
      expect(result.inFile).toBe('LICENSE.txt')
    })
  })

  describe('getEditablePackageJsonClass', () => {
    it('should return EditablePackageJson class', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      expect(EditablePackageJson).toBeDefined()
      expect(typeof EditablePackageJson).toBe('function')
    })

    it('should be able to instantiate class', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      expect(instance).toBeDefined()
    })

    it('should have static methods', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      expect(typeof EditablePackageJson.create).toBe('function')
      expect(typeof EditablePackageJson.load).toBe('function')
      expect(Array.isArray(EditablePackageJson.fixSteps)).toBe(true)
      expect(Array.isArray(EditablePackageJson.normalizeSteps)).toBe(true)
      expect(Array.isArray(EditablePackageJson.prepareSteps)).toBe(true)
    })

    it('should have instance methods', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      expect(typeof instance.fromContent).toBe('function')
      expect(typeof instance.update).toBe('function')
      expect(typeof instance.save).toBe('function')
      expect(typeof instance.saveSync).toBe('function')
    })

    it('should create instance with fromContent', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      const pkg = { name: 'test-pkg', version: '1.0.0' }
      instance.fromContent(pkg)
      expect(instance.content.name).toBe('test-pkg')
      expect(instance.content.version).toBe('1.0.0')
    })

    it('should update content with update method', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      instance.fromContent({ name: 'test', version: '1.0.0' })
      instance.update({ version: '2.0.0', description: 'Updated' })
      expect(instance.content.version).toBe('2.0.0')
      expect(instance.content.description).toBe('Updated')
    })

    it('should parse JSON string with fromJSON', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      const json = JSON.stringify({ name: 'json-test', version: '1.0.0' })
      instance.fromJSON(json)
      expect(instance.content.name).toBe('json-test')
    })

    it('should get filename property', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      instance.create('/test/path')
      const filename = instance.filename
      expect(filename).toContain('package.json')
    })

    it('should handle willSave check', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      instance.fromContent({ name: 'test', version: '1.0.0' })
      const willSave = instance.willSave()
      expect(typeof willSave).toBe('boolean')
    })
  })

  describe('pkgJsonToEditable', () => {
    it('should convert package.json to editable', () => {
      const pkg = { name: 'test', version: '1.0.0' }
      const result = pkgJsonToEditable(pkg)
      expect(result).toBeDefined()
    })

    it('should handle empty object', () => {
      const result = pkgJsonToEditable({})
      expect(result).toBeDefined()
    })

    it('should preserve package fields', () => {
      const pkg = {
        name: '@scope/pkg',
        version: '2.0.0',
        dependencies: { foo: '1.0.0' },
      }
      const result = pkgJsonToEditable(pkg)
      expect(result).toBeDefined()
    })
  })

  describe('visitLicenses', () => {
    it('should stop visiting when License visitor returns false', () => {
      const ast = {
        left: { license: 'MIT' },
        conjunction: 'or',
        right: { license: 'Apache-2.0' },
      }
      const visited: string[] = []
      visitLicenses(ast, {
        License: (node: InternalLicenseNode) => {
          visited.push(node.license)
          return node.license === 'MIT' ? false : undefined
        },
      })
      expect(visited).toEqual(['MIT'])
    })

    it('should stop visiting when BinaryOperation visitor returns false', () => {
      const ast = {
        left: {
          left: { license: 'MIT' },
          conjunction: 'and',
          right: { license: 'BSD-3-Clause' },
        },
        conjunction: 'or',
        right: { license: 'Apache-2.0' },
      }
      const visited: string[] = []
      visitLicenses(ast, {
        BinaryOperation: (node: InternalBinaryOperationNode) => {
          visited.push(node.conjunction)
          return node.conjunction === 'or' ? false : undefined
        },
      })
      expect(visited).toEqual(['or'])
    })

    it('should visit nested binary operation nodes and stop on false', () => {
      const ast = {
        left: {
          left: { license: 'MIT' },
          conjunction: 'and',
          right: { license: 'BSD' },
        },
        conjunction: 'or',
        right: { license: 'Apache-2.0' },
      }
      const licenses: string[] = []
      visitLicenses(ast, {
        License: (node: InternalLicenseNode) => {
          licenses.push(node.license)
          return node.license === 'BSD' ? false : undefined
        },
      })
      expect(licenses.length).toBeGreaterThan(1)
      expect(licenses).toContain('BSD')
    })
  })
})
