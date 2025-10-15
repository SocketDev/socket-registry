/**
 * @fileoverview Tests for SSRI hash format utilities.
 *
 * Validates conversion, validation, and parsing of SSRI and hex hash formats.
 */
import { describe, expect, it } from 'vitest'

import {
  hexToSsri,
  isValidHex,
  isValidSsri,
  parseSsri,
  ssriToHex,
} from '../../../registry/src/lib/ssri'

describe('ssri utilities', () => {
  const validSsri = 'sha256-dmgqn8O75il1F24lQfOagWiHfYKNXK2LVkYfw2rCuFY='
  const validHex =
    '76682a9fc3bbe62975176e2541f39a8168877d828d5cad8b56461fc36ac2b856'

  describe('ssriToHex', () => {
    it('should convert SSRI format to hex', () => {
      const result = ssriToHex(validSsri)
      expect(result).toBe(validHex)
    })

    it('should handle different algorithms', () => {
      const sha512Ssri = 'sha512-AAAAAAAAAAAAAAAAAAAAAA=='
      const result = ssriToHex(sha512Ssri)
      expect(result).toMatch(/^[a-f0-9]+$/i)
    })

    it('should handle uppercase algorithm names', () => {
      const upperSsri = 'SHA256-dmgqn8O75il1F24lQfOagWiHfYKNXK2LVkYfw2rCuFY='
      const result = ssriToHex(upperSsri)
      expect(result).toBe(validHex)
    })

    it('should handle mixed case algorithm names', () => {
      const mixedSsri = 'Sha512-AAAAAAAAAAAAAAAAAAAAAA=='
      const result = ssriToHex(mixedSsri)
      expect(result).toMatch(/^[a-f0-9]+$/i)
    })

    it('should handle numeric algorithm names', () => {
      const numericSsri = 'sha512-AAAAAAAAAAAAAAAAAAAAAA=='
      const result = ssriToHex(numericSsri)
      expect(result).toMatch(/^[a-f0-9]+$/i)
    })

    it('should handle base64 padding variations', () => {
      // No padding.
      const noPadding = 'sha256-YWJj'
      expect(ssriToHex(noPadding)).toMatch(/^[a-f0-9]+$/i)

      // Single padding.
      const singlePad = 'sha256-YWJjZA=='
      expect(ssriToHex(singlePad)).toMatch(/^[a-f0-9]+$/i)

      // Double padding.
      const doublePad = 'sha256-YWJjZGU='
      expect(ssriToHex(doublePad)).toMatch(/^[a-f0-9]+$/i)
    })

    it('should throw on invalid SSRI format', () => {
      expect(() => ssriToHex('nohyphen')).toThrow('Invalid SSRI format')
      expect(() => ssriToHex('')).toThrow('Invalid SSRI format')
      expect(() => ssriToHex('-noalgo')).toThrow('Invalid SSRI format')
      expect(() => ssriToHex('algo-')).toThrow('Invalid SSRI format')
      expect(() => ssriToHex('sha256--base64')).toThrow('Invalid SSRI format')
    })

    it('should throw on missing hash part', () => {
      expect(() => ssriToHex('sha256-')).toThrow('Invalid SSRI format')
    })
  })

  describe('hexToSsri', () => {
    it('should convert hex to SSRI format', () => {
      const result = hexToSsri(validHex)
      expect(result).toBe(validSsri)
    })

    it('should use default algorithm sha256', () => {
      const result = hexToSsri(validHex)
      expect(result).toMatch(/^sha256-/)
    })

    it('should accept custom algorithm', () => {
      const result = hexToSsri(validHex, 'sha512')
      expect(result).toMatch(/^sha512-/)
    })

    it('should handle uppercase hex', () => {
      const upperHex = validHex.toUpperCase()
      const result = hexToSsri(upperHex)
      expect(result).toBe(validSsri)
    })

    it('should handle mixed case hex', () => {
      const mixedHex =
        '76682A9FC3BBE62975176E2541f39a8168877d828d5cad8b56461fc36ac2b856'
      const result = hexToSsri(mixedHex)
      expect(result).toBe(validSsri)
    })

    it('should handle short hex values', () => {
      const shortHex = 'abc123'
      const result = hexToSsri(shortHex)
      expect(result).toMatch(/^sha256-/)
      expect(result.length).toBeGreaterThan(7)
    })

    it('should handle long hex values', () => {
      const longHex = validHex.repeat(2)
      const result = hexToSsri(longHex)
      expect(result).toMatch(/^sha256-/)
    })

    it('should handle various custom algorithms', () => {
      expect(hexToSsri(validHex, 'sha1')).toMatch(/^sha1-/)
      expect(hexToSsri(validHex, 'sha384')).toMatch(/^sha384-/)
      expect(hexToSsri(validHex, 'sha512')).toMatch(/^sha512-/)
      expect(hexToSsri(validHex, 'md5')).toMatch(/^md5-/)
    })

    it('should throw on invalid hex format', () => {
      expect(() => hexToSsri('invalid-hex-string')).toThrow(
        'Invalid hex format',
      )
      expect(() => hexToSsri('zzzz')).toThrow('Invalid hex format')
      expect(() => hexToSsri('sha256-base64==')).toThrow('Invalid hex format')
    })

    it('should throw on empty string', () => {
      expect(() => hexToSsri('')).toThrow('Invalid hex format')
    })

    it('should throw on hex with spaces', () => {
      expect(() => hexToSsri('abc 123')).toThrow('Invalid hex format')
    })

    it('should throw on hex with special characters', () => {
      expect(() => hexToSsri('abc@123')).toThrow('Invalid hex format')
      expect(() => hexToSsri('abc#123')).toThrow('Invalid hex format')
    })
  })

  describe('isValidSsri', () => {
    it('should validate correct SSRI format', () => {
      expect(isValidSsri(validSsri)).toBe(true)
      expect(isValidSsri('sha512-AAAAAAAAAA==')).toBe(true)
      expect(isValidSsri('sha1-abc123==')).toBe(true)
    })

    it('should accept various algorithm formats', () => {
      expect(isValidSsri('SHA256-abc123==')).toBe(true)
      expect(isValidSsri('md5-abc123==')).toBe(true)
      expect(isValidSsri('sha384-abc123==')).toBe(true)
    })

    it('should accept minimum valid SSRI length', () => {
      expect(isValidSsri('sha256-ab')).toBe(true)
    })

    it('should accept SSRI without padding', () => {
      expect(isValidSsri('sha256-YWJj')).toBe(true)
    })

    it('should accept SSRI with single padding', () => {
      expect(isValidSsri('sha256-YWJjZGU=')).toBe(true)
    })

    it('should accept SSRI with double padding', () => {
      expect(isValidSsri('sha256-YWJjZA==')).toBe(true)
    })

    it('should accept SSRI with mixed case algorithm', () => {
      expect(isValidSsri('Sha256-abc123==')).toBe(true)
      expect(isValidSsri('SHA512-abc123==')).toBe(true)
    })

    it('should reject invalid SSRI format', () => {
      expect(isValidSsri(validHex)).toBe(false)
      expect(isValidSsri('nohyphen')).toBe(false)
      expect(isValidSsri('sha256-')).toBe(false)
      expect(isValidSsri('-base64==')).toBe(false)
      expect(isValidSsri('')).toBe(false)
      expect(isValidSsri('sha256-a')).toBe(false)
    })

    it('should reject SSRI with invalid algorithm', () => {
      expect(isValidSsri('sha-256-abc123==')).toBe(false)
      expect(isValidSsri('sha@256-abc123==')).toBe(false)
    })

    it('should reject SSRI with multiple hyphens', () => {
      expect(isValidSsri('sha256--abc123==')).toBe(false)
      expect(isValidSsri('sha256-abc-123==')).toBe(false)
    })

    it('should reject SSRI with spaces', () => {
      expect(isValidSsri('sha256 -abc123==')).toBe(false)
      expect(isValidSsri('sha256- abc123==')).toBe(false)
    })

    it('should reject SSRI with invalid base64 characters', () => {
      expect(isValidSsri('sha256-abc!def')).toBe(false)
      expect(isValidSsri('sha256-abc@def')).toBe(false)
    })

    it('should accept SSRI with special base64 characters', () => {
      expect(isValidSsri('sha256-abc+def/ghi=')).toBe(true)
      expect(isValidSsri('sha256-ABC+DEF/GHI=')).toBe(true)
    })

    it('should accept long base64 hashes', () => {
      const longHash = 'A'.repeat(100)
      expect(isValidSsri(`sha256-${longHash}`)).toBe(true)
    })
  })

  describe('isValidHex', () => {
    it('should validate correct hex format', () => {
      expect(isValidHex(validHex)).toBe(true)
      expect(isValidHex('abc123')).toBe(true)
      expect(isValidHex('ABCDEF')).toBe(true)
      expect(isValidHex('0123456789abcdef')).toBe(true)
    })

    it('should accept uppercase hex', () => {
      expect(isValidHex('ABCDEF123456')).toBe(true)
    })

    it('should accept mixed case hex', () => {
      expect(isValidHex('AbCdEf123456')).toBe(true)
    })

    it('should accept single character hex', () => {
      expect(isValidHex('a')).toBe(true)
      expect(isValidHex('F')).toBe(true)
      expect(isValidHex('0')).toBe(true)
    })

    it('should accept long hex strings', () => {
      const longHex = validHex.repeat(10)
      expect(isValidHex(longHex)).toBe(true)
    })

    it('should accept all hex digits', () => {
      expect(isValidHex('0123456789abcdefABCDEF')).toBe(true)
    })

    it('should reject invalid hex format', () => {
      expect(isValidHex(validSsri)).toBe(false)
      expect(isValidHex('sha256-base64==')).toBe(false)
      expect(isValidHex('ghijk')).toBe(false)
      expect(isValidHex('abc-123')).toBe(false)
      expect(isValidHex('')).toBe(false)
    })

    it('should reject hex with spaces', () => {
      expect(isValidHex('abc 123')).toBe(false)
      expect(isValidHex(' abc123')).toBe(false)
      expect(isValidHex('abc123 ')).toBe(false)
    })

    it('should reject hex with special characters', () => {
      expect(isValidHex('abc+123')).toBe(false)
      expect(isValidHex('abc/123')).toBe(false)
      expect(isValidHex('abc=123')).toBe(false)
      expect(isValidHex('abc@123')).toBe(false)
      expect(isValidHex('abc#123')).toBe(false)
      expect(isValidHex('abc!123')).toBe(false)
    })

    it('should reject hex with invalid letters', () => {
      expect(isValidHex('abcdefg')).toBe(false)
      expect(isValidHex('xyz123')).toBe(false)
      expect(isValidHex('abcdefghijk')).toBe(false)
    })

    it('should reject hex with newlines or tabs', () => {
      expect(isValidHex('abc\n123')).toBe(false)
      expect(isValidHex('abc\t123')).toBe(false)
    })
  })

  describe('parseSsri', () => {
    it('should parse SSRI into components', () => {
      const result = parseSsri(validSsri)
      expect(result.algorithm).toBe('sha256')
      expect(result.base64Hash).toBe(
        'dmgqn8O75il1F24lQfOagWiHfYKNXK2LVkYfw2rCuFY=',
      )
    })

    it('should handle different algorithms', () => {
      const sha512Result = parseSsri('sha512-AAAAAAAAAA==')
      expect(sha512Result.algorithm).toBe('sha512')
      expect(sha512Result.base64Hash).toBe('AAAAAAAAAA==')
    })

    it('should parse uppercase algorithm', () => {
      const result = parseSsri('SHA256-abc123==')
      expect(result.algorithm).toBe('SHA256')
      expect(result.base64Hash).toBe('abc123==')
    })

    it('should parse mixed case algorithm', () => {
      const result = parseSsri('Sha512-xyz789==')
      expect(result.algorithm).toBe('Sha512')
      expect(result.base64Hash).toBe('xyz789==')
    })

    it('should parse SSRI without padding', () => {
      const result = parseSsri('sha256-YWJj')
      expect(result.algorithm).toBe('sha256')
      expect(result.base64Hash).toBe('YWJj')
    })

    it('should parse SSRI with single padding', () => {
      const result = parseSsri('sha256-YWJjZGU=')
      expect(result.algorithm).toBe('sha256')
      expect(result.base64Hash).toBe('YWJjZGU=')
    })

    it('should parse SSRI with double padding', () => {
      const result = parseSsri('sha256-YWJjZA==')
      expect(result.algorithm).toBe('sha256')
      expect(result.base64Hash).toBe('YWJjZA==')
    })

    it('should parse SSRI with special base64 characters', () => {
      const result = parseSsri('sha256-abc+def/ghi=')
      expect(result.algorithm).toBe('sha256')
      expect(result.base64Hash).toBe('abc+def/ghi=')
    })

    it('should parse various hash algorithms', () => {
      expect(parseSsri('sha1-abc==').algorithm).toBe('sha1')
      expect(parseSsri('sha384-abc==').algorithm).toBe('sha384')
      expect(parseSsri('md5-abc==').algorithm).toBe('md5')
    })

    it('should parse numeric algorithm names', () => {
      const result = parseSsri('sha512-test==')
      expect(result.algorithm).toBe('sha512')
      expect(result.base64Hash).toBe('test==')
    })

    it('should throw on invalid SSRI format', () => {
      expect(() => parseSsri('nohyphen')).toThrow('Invalid SSRI format')
      expect(() => parseSsri('')).toThrow('Invalid SSRI format')
      expect(() => parseSsri('-nohash')).toThrow('Invalid SSRI format')
    })

    it('should throw on missing algorithm', () => {
      expect(() => parseSsri('-abc123==')).toThrow('Invalid SSRI format')
    })

    it('should throw on missing hash', () => {
      expect(() => parseSsri('sha256-')).toThrow('Invalid SSRI format')
    })

    it('should throw on missing hyphen', () => {
      expect(() => parseSsri('sha256abc123==')).toThrow('Invalid SSRI format')
    })

    it('should throw on multiple hyphens', () => {
      expect(() => parseSsri('sha256--abc123==')).toThrow('Invalid SSRI format')
    })
  })

  describe('round-trip conversion', () => {
    it('should preserve hash through SSRI -> hex -> SSRI', () => {
      const hex = ssriToHex(validSsri)
      const ssri = hexToSsri(hex)
      expect(ssri).toBe(validSsri)
    })

    it('should preserve hash through hex -> SSRI -> hex', () => {
      const ssri = hexToSsri(validHex)
      const hex = ssriToHex(ssri)
      expect(hex).toBe(validHex)
    })

    it('should preserve hash with uppercase hex input', () => {
      const upperHex = validHex.toUpperCase()
      const ssri = hexToSsri(upperHex)
      const hex = ssriToHex(ssri)
      expect(hex.toLowerCase()).toBe(validHex)
    })

    it('should preserve hash with mixed case hex input', () => {
      const mixedHex =
        '76682A9FC3BBE62975176E2541f39a8168877d828d5cad8b56461fc36ac2b856'
      const ssri = hexToSsri(mixedHex)
      const hex = ssriToHex(ssri)
      expect(hex).toBe(validHex)
    })

    it('should preserve hash with different algorithms', () => {
      const sha512Ssri = hexToSsri(validHex, 'sha512')
      const hex = ssriToHex(sha512Ssri)
      expect(hex).toBe(validHex)

      const sha1Ssri = hexToSsri(validHex, 'sha1')
      const hex2 = ssriToHex(sha1Ssri)
      expect(hex2).toBe(validHex)
    })

    it('should handle multiple round trips', () => {
      let current = validHex
      // hex -> ssri -> hex -> ssri -> hex.
      for (let i = 0; i < 5; i += 1) {
        const ssri = hexToSsri(current)
        current = ssriToHex(ssri)
      }
      expect(current).toBe(validHex)
    })

    it('should preserve short hashes', () => {
      const shortHex = 'abc123'
      const ssri = hexToSsri(shortHex)
      const hex = ssriToHex(ssri)
      expect(hex).toBe(shortHex)
    })

    it('should preserve long hashes', () => {
      const longHex = validHex.repeat(2)
      const ssri = hexToSsri(longHex)
      const hex = ssriToHex(ssri)
      expect(hex).toBe(longHex)
    })
  })

  describe('edge cases and integration', () => {
    it('should handle ssriToHex with parseSsri result', () => {
      const parsed = parseSsri(validSsri)
      const reconstructed = `${parsed.algorithm}-${parsed.base64Hash}`
      const hex = ssriToHex(reconstructed)
      expect(hex).toBe(validHex)
    })

    it('should handle hexToSsri with isValidHex validation', () => {
      expect(isValidHex(validHex)).toBe(true)
      const ssri = hexToSsri(validHex)
      expect(isValidSsri(ssri)).toBe(true)
    })

    it('should validate all outputs are in correct format', () => {
      const ssri = hexToSsri(validHex)
      expect(isValidSsri(ssri)).toBe(true)

      const hex = ssriToHex(validSsri)
      expect(isValidHex(hex)).toBe(true)
    })

    it('should handle parsing and converting', () => {
      const parsed = parseSsri(validSsri)
      const ssri = hexToSsri(ssriToHex(validSsri), parsed.algorithm)
      expect(ssri).toBe(validSsri)
    })

    it('should handle real-world SHA-256 hashes', () => {
      const testCases = [
        {
          ssri: 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
          hex: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
        {
          ssri: 'sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=',
          hex: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        },
      ]

      for (const { hex, ssri } of testCases) {
        expect(ssriToHex(ssri)).toBe(hex)
        expect(hexToSsri(hex)).toBe(ssri)
      }
    })

    it('should handle SHA-512 hashes', () => {
      const sha512Hex =
        'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
      const sha512Ssri = hexToSsri(sha512Hex, 'sha512')
      expect(isValidSsri(sha512Ssri)).toBe(true)
      expect(ssriToHex(sha512Ssri)).toBe(sha512Hex)
    })

    it('should handle different padding scenarios', () => {
      const testCases = [
        // No padding.
        { hex: '616263', ssri: 'sha256-YWJj' },
        // Double padding.
        { hex: '61626364', ssri: 'sha256-YWJjZA==' },
        // Single padding.
        { hex: '6162636465', ssri: 'sha256-YWJjZGU=' },
      ]

      for (const { hex, ssri } of testCases) {
        expect(hexToSsri(hex)).toBe(ssri)
        expect(ssriToHex(ssri)).toBe(hex)
      }
    })
  })
})
