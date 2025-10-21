/**
 * @fileoverview Tests for ANSI escape code utilities.
 * Covers ANSI constants, regex generation, and string stripping.
 */

import {
  ANSI_BOLD,
  ANSI_DIM,
  ANSI_ITALIC,
  ANSI_RESET,
  ANSI_STRIKETHROUGH,
  ANSI_UNDERLINE,
  ansiRegex,
  stripAnsi,
} from '@socketsecurity/lib/ansi'
import { describe, expect, it } from 'vitest'

describe('ansi module', () => {
  describe('ANSI constants', () => {
    it('should have correct ANSI reset code', () => {
      expect(ANSI_RESET).toBe('\x1b[0m')
    })

    it('should have correct ANSI bold code', () => {
      expect(ANSI_BOLD).toBe('\x1b[1m')
    })

    it('should have correct ANSI dim code', () => {
      expect(ANSI_DIM).toBe('\x1b[2m')
    })

    it('should have correct ANSI italic code', () => {
      expect(ANSI_ITALIC).toBe('\x1b[3m')
    })

    it('should have correct ANSI underline code', () => {
      expect(ANSI_UNDERLINE).toBe('\x1b[4m')
    })

    it('should have correct ANSI strikethrough code', () => {
      expect(ANSI_STRIKETHROUGH).toBe('\x1b[9m')
    })

    it('should all be strings', () => {
      expect(typeof ANSI_RESET).toBe('string')
      expect(typeof ANSI_BOLD).toBe('string')
      expect(typeof ANSI_DIM).toBe('string')
      expect(typeof ANSI_ITALIC).toBe('string')
      expect(typeof ANSI_UNDERLINE).toBe('string')
      expect(typeof ANSI_STRIKETHROUGH).toBe('string')
    })

    it('should all start with ESC character', () => {
      expect(ANSI_RESET.startsWith('\x1b[')).toBe(true)
      expect(ANSI_BOLD.startsWith('\x1b[')).toBe(true)
      expect(ANSI_DIM.startsWith('\x1b[')).toBe(true)
      expect(ANSI_ITALIC.startsWith('\x1b[')).toBe(true)
      expect(ANSI_UNDERLINE.startsWith('\x1b[')).toBe(true)
      expect(ANSI_STRIKETHROUGH.startsWith('\x1b[')).toBe(true)
    })

    it('should all end with m', () => {
      expect(ANSI_RESET.endsWith('m')).toBe(true)
      expect(ANSI_BOLD.endsWith('m')).toBe(true)
      expect(ANSI_DIM.endsWith('m')).toBe(true)
      expect(ANSI_ITALIC.endsWith('m')).toBe(true)
      expect(ANSI_UNDERLINE.endsWith('m')).toBe(true)
      expect(ANSI_STRIKETHROUGH.endsWith('m')).toBe(true)
    })
  })

  describe('ansiRegex', () => {
    it('should create a global regex by default', () => {
      const regex = ansiRegex()
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(true)
    })

    it('should create a non-global regex when onlyFirst is true', () => {
      const regex = ansiRegex({ onlyFirst: true })
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(false)
    })

    it('should match CSI escape sequences', () => {
      const regex = ansiRegex()
      const text = '\x1b[31mRed text\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeDefined()
      expect(matches?.length).toBe(2)
      expect(matches).toContain('\x1b[31m')
      expect(matches).toContain('\x1b[0m')
    })

    it('should match OSC sequences', () => {
      const regex = ansiRegex()
      // OSC sequence: ESC ] ... BEL
      const text = '\x1b]0;Title\x07Normal text'
      const matches = text.match(regex)
      expect(matches).toBeDefined()
      expect(matches?.length).toBeGreaterThan(0)
    })

    it('should match complex color codes', () => {
      const regex = ansiRegex()
      const text = '\x1b[38;5;208mOrange\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeDefined()
      expect(matches?.length).toBe(2)
    })

    it('should match 256 color codes', () => {
      const regex = ansiRegex()
      const text = '\x1b[48;5;200mBackground\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeDefined()
      expect(matches?.length).toBe(2)
    })

    it('should match RGB color codes', () => {
      const regex = ansiRegex()
      const text = '\x1b[38;2;255;100;50mRGB color\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeDefined()
      expect(matches?.length).toBe(2)
    })

    it('should match combined styles', () => {
      const regex = ansiRegex()
      const text = '\x1b[1;4;31mBold underline red\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeDefined()
      expect(matches?.length).toBe(2)
    })

    it('should not match plain text', () => {
      const regex = ansiRegex()
      const text = 'Plain text without ANSI codes'
      const matches = text.match(regex)
      expect(matches).toBeNull()
    })

    it('should match only first occurrence when onlyFirst is true', () => {
      const regex = ansiRegex({ onlyFirst: true })
      const text = '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m'
      const match = regex.exec(text)
      expect(match).toBeDefined()
      expect(match?.[0]).toBe('\x1b[31m')
    })

    it('should handle empty string', () => {
      const regex = ansiRegex()
      const matches = ''.match(regex)
      expect(matches).toBeNull()
    })

    it('should handle undefined options', () => {
      const regex = ansiRegex(undefined)
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(true)
    })

    it('should handle empty options object', () => {
      const regex = ansiRegex({})
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(true)
    })
  })

  describe('stripAnsi', () => {
    it('should remove ANSI codes from text', () => {
      const text = `${ANSI_BOLD}Bold text${ANSI_RESET}`
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Bold text')
    })

    it('should remove color codes', () => {
      const text = '\x1b[31mRed\x1b[32mGreen\x1b[33mYellow\x1b[0m'
      const stripped = stripAnsi(text)
      expect(stripped).toBe('RedGreenYellow')
    })

    it('should remove multiple ANSI codes', () => {
      const text = `${ANSI_BOLD}${ANSI_UNDERLINE}Bold underline${ANSI_RESET}`
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Bold underline')
    })

    it('should handle text without ANSI codes', () => {
      const text = 'Plain text'
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Plain text')
    })

    it('should handle empty string', () => {
      const stripped = stripAnsi('')
      expect(stripped).toBe('')
    })

    it('should preserve text structure', () => {
      const text = `${ANSI_BOLD}Line 1${ANSI_RESET}\nLine 2\n${ANSI_ITALIC}Line 3${ANSI_RESET}`
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should handle text with spaces', () => {
      const text = `${ANSI_BOLD}  Indented  ${ANSI_RESET}`
      const stripped = stripAnsi(text)
      expect(stripped).toBe('  Indented  ')
    })

    it('should handle text with special characters', () => {
      const text = `${ANSI_BOLD}Test: 123!@#$%${ANSI_RESET}`
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Test: 123!@#$%')
    })

    it('should handle complex formatted text', () => {
      const text =
        '\x1b[1m\x1b[31mBold Red\x1b[0m Normal \x1b[4m\x1b[32mUnderline Green\x1b[0m'
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Bold Red Normal Underline Green')
    })

    it('should handle 256 color codes', () => {
      const text = '\x1b[38;5;200mColor 200\x1b[0m'
      const stripped = stripAnsi(text)
      expect(stripped).toBe('Color 200')
    })

    it('should handle RGB color codes', () => {
      const text = '\x1b[38;2;255;100;50mRGB\x1b[0m'
      const stripped = stripAnsi(text)
      expect(stripped).toBe('RGB')
    })

    it('should not modify strings with no ANSI', () => {
      const text = 'No ANSI codes here'
      const stripped = stripAnsi(text)
      expect(stripped).toBe(text)
      expect(stripped).toStrictEqual(text)
    })
  })

  describe('integration tests', () => {
    it('should work with real-world formatted strings', () => {
      const formatted = `${ANSI_BOLD}${ANSI_UNDERLINE}Important:${ANSI_RESET} This is a message`
      const cleaned = stripAnsi(formatted)
      expect(cleaned).toBe('Important: This is a message')
    })

    it('should handle mixed ANSI codes and styling', () => {
      const text = `
        ${ANSI_BOLD}Header${ANSI_RESET}
        ${ANSI_DIM}Subtitle${ANSI_RESET}
        ${ANSI_ITALIC}Description${ANSI_RESET}
      `
      const stripped = stripAnsi(text)
      expect(stripped).toContain('Header')
      expect(stripped).toContain('Subtitle')
      expect(stripped).toContain('Description')
      expect(stripped).not.toContain('\x1b')
    })

    it('should handle error message formatting', () => {
      const error = `${ANSI_BOLD}\x1b[31mError:${ANSI_RESET} Something went wrong`
      const stripped = stripAnsi(error)
      expect(stripped).toBe('Error: Something went wrong')
    })

    it('should handle success message formatting', () => {
      const success = `${ANSI_BOLD}\x1b[32m✓${ANSI_RESET} Test passed`
      const stripped = stripAnsi(success)
      expect(stripped).toBe('✓ Test passed')
    })

    it('should preserve Unicode characters', () => {
      const text = `${ANSI_BOLD}🎉 Success! 中文 العربية${ANSI_RESET}`
      const stripped = stripAnsi(text)
      expect(stripped).toBe('🎉 Success! 中文 العربية')
    })
  })

  describe('ansiRegex and stripAnsi consistency', () => {
    it('should match what stripAnsi removes', () => {
      const text = `${ANSI_BOLD}Bold${ANSI_RESET} and ${ANSI_ITALIC}Italic${ANSI_RESET}`
      const regex = ansiRegex()
      const matches = text.match(regex)
      const stripped = stripAnsi(text)

      expect(matches).toBeDefined()
      expect(stripped).not.toContain('\x1b')
      expect(stripped).toBe('Bold and Italic')
    })

    it('should handle the same edge cases', () => {
      const testCases = [
        '',
        'Plain text',
        '\x1b[0m',
        '\x1b[1m\x1b[31mRed\x1b[0m',
        '\x1b[38;5;200mColor\x1b[0m',
      ]

      for (const testCase of testCases) {
        const regex = ansiRegex()
        const hasMatches = regex.test(testCase)
        const stripped = stripAnsi(testCase)
        const wasModified = stripped !== testCase

        // If regex found matches, stripAnsi should modify the string
        if (hasMatches && testCase.includes('\x1b')) {
          expect(wasModified).toBe(true)
        }
      }
    })
  })
})
