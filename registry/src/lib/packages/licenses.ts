/**
 * @fileoverview SPDX license parsing and analysis utilities.
 */

import LOOP_SENTINEL from '../constants/LOOP_SENTINEL'
import copyLeftLicenses from '../constants/copy-left-licenses'
import { normalizePath } from '../path'

import type { LicenseNode } from '../packages'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectHasOwn = Object.hasOwn

const BINARY_OPERATION_NODE_TYPE = 'BinaryOperation'
const LICENSE_NODE_TYPE = 'License'

const fileReferenceRegExp = /^SEE LICEN[CS]E IN (.+)$/

let _path: typeof import('path') | undefined
/**
 * Lazily load the path module to avoid Webpack errors.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path!
}

let _spdxCorrect: typeof import('spdx-correct') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSpdxCorrect() {
  if (_spdxCorrect === undefined) {
    // The 'spdx-correct' package is browser safe.
    _spdxCorrect = /*@__PURE__*/ require('../../external/spdx-correct')
  }
  return _spdxCorrect!
}

let _spdxExpParse: typeof import('spdx-expression-parse') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSpdxExpParse() {
  if (_spdxExpParse === undefined) {
    // The 'spdx-expression-parse' package is browser safe.
    _spdxExpParse = /*@__PURE__*/ require('../../external/spdx-expression-parse')
  }
  return _spdxExpParse!
}

// Duplicated from spdx-expression-parse - AST node types.
export interface SpdxLicenseNode {
  license: string
  plus?: boolean | undefined
  exception?: string | undefined
}

export interface SpdxBinaryOperationNode {
  left: SpdxLicenseNode | SpdxBinaryOperationNode
  conjunction: 'and' | 'or'
  right: SpdxLicenseNode | SpdxBinaryOperationNode
}

export type SpdxAstNode = SpdxLicenseNode | SpdxBinaryOperationNode

// Internal AST node types with type discriminator.
export interface InternalLicenseNode extends SpdxLicenseNode {
  type: 'License'
}

export interface InternalBinaryOperationNode {
  type: 'BinaryOperation'
  left: InternalLicenseNode | InternalBinaryOperationNode
  conjunction: 'and' | 'or'
  right: InternalLicenseNode | InternalBinaryOperationNode
}

export type InternalAstNode = InternalLicenseNode | InternalBinaryOperationNode

export interface LicenseVisitor {
  License?: (
    node: InternalLicenseNode,
    parent?: InternalAstNode,
  ) => boolean | void
  BinaryOperation?: (
    node: InternalBinaryOperationNode,
    parent?: InternalAstNode,
  ) => boolean | void
}

/**
 * Collect licenses that are incompatible (copyleft).
 */
/*@__NO_SIDE_EFFECTS__*/
export function collectIncompatibleLicenses(
  licenseNodes: LicenseNode[],
): LicenseNode[] {
  const result = []
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    if (node && copyLeftLicenses.has(node.license)) {
      result.push(node)
    }
  }
  return result
}

/**
 * Collect warnings from license nodes.
 */
/*@__NO_SIDE_EFFECTS__*/
export function collectLicenseWarnings(licenseNodes: LicenseNode[]): string[] {
  const warnings = new Map()
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    if (!node) {
      continue
    }
    const { license } = node
    if (license === 'UNLICENSED') {
      warnings.set('UNLICENSED', `Package is unlicensed`)
    } else if (node.inFile !== undefined) {
      warnings.set('IN_FILE', `License terms specified in ${node.inFile}`)
    }
  }
  return [...warnings.values()]
}

/**
 * Create an AST node from a raw node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createAstNode(rawNode: SpdxAstNode): InternalAstNode {
  return ObjectHasOwn(rawNode, 'license')
    ? createLicenseNode(rawNode as SpdxLicenseNode)
    : createBinaryOperationNode(rawNode as SpdxBinaryOperationNode)
}

/**
 * Create a binary operation AST node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createBinaryOperationNode(
  rawNodeParam: SpdxBinaryOperationNode,
): InternalBinaryOperationNode {
  let left: InternalAstNode | undefined
  let right: InternalAstNode | undefined
  let rawLeft: SpdxAstNode | undefined = rawNodeParam.left
  let rawRight: SpdxAstNode | undefined = rawNodeParam.right
  const { conjunction } = rawNodeParam
  // Clear the reference to help with memory management.
  return {
    __proto__: null,
    type: BINARY_OPERATION_NODE_TYPE as 'BinaryOperation',
    get left() {
      if (left === undefined) {
        left = createAstNode(rawLeft!)
        rawLeft = undefined
      }
      return left
    },
    conjunction,
    get right() {
      if (right === undefined) {
        right = createAstNode(rawRight!)
        rawRight = undefined
      }
      return right
    },
  } as InternalBinaryOperationNode
}

/**
 * Create a license AST node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createLicenseNode(
  rawNode: SpdxLicenseNode,
): InternalLicenseNode {
  return {
    __proto__: null,
    ...rawNode,
    type: LICENSE_NODE_TYPE as 'License',
  } as InternalLicenseNode
}

/**
 * Parse an SPDX license expression into an AST.
 */
/*@__NO_SIDE_EFFECTS__*/
export function parseSpdxExp(spdxExp: string): SpdxAstNode | undefined {
  const spdxExpParse = getSpdxExpParse()
  try {
    return spdxExpParse(spdxExp)
  } catch {}
  const spdxCorrect = getSpdxCorrect()
  const corrected = spdxCorrect(spdxExp)
  return corrected ? spdxExpParse(corrected) : undefined
}

/**
 * Parse package license field into structured license nodes.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageLicenses(
  licenseFieldValue: string,
  where: string,
): LicenseNode[] {
  // Based off of validate-npm-package-license which npm, by way of normalize-package-data,
  // uses to validate license field values:
  // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L40-L41
  if (
    licenseFieldValue === 'UNLICENSED' ||
    licenseFieldValue === 'UNLICENCED'
  ) {
    return [{ license: 'UNLICENSED' }]
  }
  // Match "SEE LICENSE IN <relativeFilepathToLicense>"
  // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L48-L53
  const match = fileReferenceRegExp.exec(licenseFieldValue)
  if (match) {
    const path = getPath()
    return [
      {
        license: licenseFieldValue,
        inFile: normalizePath(path.relative(where, match[1] || '')),
      },
    ]
  }
  const licenseNodes: InternalLicenseNode[] = []
  const ast = parseSpdxExp(licenseFieldValue)
  if (ast) {
    // SPDX expressions are valid, too except if they contain "LicenseRef" or
    // "DocumentRef". If the licensing terms cannot be described with standardized
    // SPDX identifiers, then the terms should be put in a file in the package
    // and the license field should point users there, e.g. "SEE LICENSE IN LICENSE.txt".
    // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L18-L24
    visitLicenses(ast, {
      License(node: InternalLicenseNode) {
        const { license } = node
        if (
          license.startsWith('LicenseRef') ||
          license.startsWith('DocumentRef')
        ) {
          licenseNodes.length = 0
          return false
        }
        licenseNodes.push(node)
      },
    })
  }
  return licenseNodes
}

/**
 * Traverse SPDX license AST and invoke visitor callbacks for each node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function visitLicenses(ast: SpdxAstNode, visitor: LicenseVisitor): void {
  const queue: Array<[InternalAstNode, InternalAstNode | undefined]> = [
    [createAstNode(ast), undefined],
  ]
  let pos = 0
  let { length: queueLength } = queue
  while (pos < queueLength) {
    if (pos === LOOP_SENTINEL) {
      throw new Error('Detected infinite loop in ast crawl of visitLicenses')
    }
    // AST nodes can be a license node which looks like
    //   {
    //     license: string
    //     plus?: boolean
    //     exception?: string
    //   }
    // or a binary operation node which looks like
    //   {
    //     left: License | BinaryOperation
    //     conjunction: string
    //     right: License | BinaryOperation
    //   }
    const { 0: node, 1: parent } = queue[pos++]!
    const { type } = node
    if (typeof visitor[type] === 'function' && ObjectHasOwn(visitor, type)) {
      if (type === LICENSE_NODE_TYPE) {
        const licenseVisitor = visitor.License
        if (
          licenseVisitor &&
          licenseVisitor(node as InternalLicenseNode, parent) === false
        ) {
          break
        }
      } else if (type === BINARY_OPERATION_NODE_TYPE) {
        const binaryOpVisitor = visitor.BinaryOperation
        if (
          binaryOpVisitor &&
          binaryOpVisitor(node as InternalBinaryOperationNode, parent) === false
        ) {
          break
        }
      }
    }
    if (type === BINARY_OPERATION_NODE_TYPE) {
      queue[queueLength++] = [node.left, node]
      queue[queueLength++] = [node.right, node]
    }
  }
}
