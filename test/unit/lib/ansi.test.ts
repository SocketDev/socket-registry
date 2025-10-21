/**
 * @fileoverview Tests for ANSI escape code utilities.
 *
 * Validates ANSI constants and utility functions for terminal formatting.
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

describe('ansi utilities', () => {
  describe('ANSI constants', () => {
    it('should have correct RESET code', () => {
      expect(ANSI_RESET).toBe('\x1b[0m')
    })

    it('should have correct BOLD code', () => {
      expect(ANSI_BOLD).toBe('\x1b[1m')
    })

    it('should have correct DIM code', () => {
      expect(ANSI_DIM).toBe('\x1b[2m')
    })

    it('should have correct ITALIC code', () => {
      expect(ANSI_ITALIC).toBe('\x1b[3m')
    })

    it('should have correct UNDERLINE code', () => {
      expect(ANSI_UNDERLINE).toBe('\x1b[4m')
    })

    it('should have correct STRIKETHROUGH code', () => {
      expect(ANSI_STRIKETHROUGH).toBe('\x1b[9m')
    })

    it('should have all constants as strings', () => {
      expect(typeof ANSI_RESET).toBe('string')
      expect(typeof ANSI_BOLD).toBe('string')
      expect(typeof ANSI_DIM).toBe('string')
      expect(typeof ANSI_ITALIC).toBe('string')
      expect(typeof ANSI_UNDERLINE).toBe('string')
      expect(typeof ANSI_STRIKETHROUGH).toBe('string')
    })

    it('should have non-empty constants', () => {
      expect(ANSI_RESET.length).toBeGreaterThan(0)
      expect(ANSI_BOLD.length).toBeGreaterThan(0)
      expect(ANSI_DIM.length).toBeGreaterThan(0)
      expect(ANSI_ITALIC.length).toBeGreaterThan(0)
      expect(ANSI_UNDERLINE.length).toBeGreaterThan(0)
      expect(ANSI_STRIKETHROUGH.length).toBeGreaterThan(0)
    })
  })

  describe('ansiRegex', () => {
    it('should create a global regex by default', () => {
      const regex = ansiRegex()
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(true)
    })

    it('should create a non-global regex with onlyFirst option', () => {
      const regex = ansiRegex({ onlyFirst: true })
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(false)
    })

    it('should match basic ANSI escape codes', () => {
      const regex = ansiRegex()
      const text = '\x1b[31mred text\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
      expect(matches?.length).toBeGreaterThan(0)
    })

    it('should match color codes', () => {
      const regex = ansiRegex()
      const text = '\x1b[31mred\x1b[32mgreen\x1b[34mblue\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
      expect(matches?.length).toBeGreaterThanOrEqual(4)
    })

    it('should match style codes', () => {
      const regex = ansiRegex()
      const boldText = '\x1b[1mbold\x1b[0m'
      const matches = boldText.match(regex)
      expect(matches).toBeTruthy()
      expect(matches?.length).toBe(2)
    })

    it('should match reset code', () => {
      const regex = ansiRegex()
      expect('\x1b[0m').toMatch(regex)
    })

    it('should match complex sequences', () => {
      const regex = ansiRegex()
      const text = '\x1b[1;31mbold red\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
      expect(matches?.length).toBeGreaterThan(0)
    })

    it('should match C1 control sequences', () => {
      const regex = ansiRegex()
      const text = '\x9b31mtext\x9b0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
    })

    it('should match OSC sequences with BEL terminator', () => {
      const regex = ansiRegex()
      const text = '\x1b]0;title\x07'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
    })

    it('should match OSC sequences with ESC backslash terminator', () => {
      const regex = ansiRegex()
      const text = '\x1b]0;title\x1b\\'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
    })

    it('should match OSC sequences with ST terminator', () => {
      const regex = ansiRegex()
      const text = '\x1b]0;title\x9c'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
    })

    it('should not match plain text', () => {
      const regex = ansiRegex()
      const text = 'plain text without any codes'
      const matches = text.match(regex)
      expect(matches).toBeNull()
    })

    it('should handle empty options object', () => {
      const regex = ansiRegex({})
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.global).toBe(true)
    })

    it('should handle onlyFirst false explicitly', () => {
      const regex = ansiRegex({ onlyFirst: false })
      expect(regex.global).toBe(true)
    })

    it('should match sequences with parameters', () => {
      const regex = ansiRegex()
      const text = '\x1b[38;5;123mcolored text\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
      expect(matches?.length).toBeGreaterThan(0)
    })

    it('should match sequences with colon separators', () => {
      const regex = ansiRegex()
      const text = '\x1b[38:5:123mtext\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
    })

    it('should match multiple consecutive codes', () => {
      const regex = ansiRegex()
      const text = '\x1b[1m\x1b[31m\x1b[4mtext\x1b[0m'
      const matches = text.match(regex)
      expect(matches).toBeTruthy()
      expect(matches?.length).toBeGreaterThan(3)
    })

    it('should match CSI sequences with various final bytes', () => {
      const regex = ansiRegex()
      expect('\x1b[2Jclear screen').toMatch(regex)
      expect('\x1b[H').toMatch(regex)
      expect('\x1b[5A').toMatch(regex)
    })
  })

  describe('stripAnsi', () => {
    it('should remove ANSI escape codes from text', () => {
      const colored = '\x1b[31mred text\x1b[0m'
      const result = stripAnsi(colored)
      expect(result).toBe('red text')
    })

    it('should handle plain text without ANSI codes', () => {
      const plain = 'plain text'
      const result = stripAnsi(plain)
      expect(result).toBe('plain text')
    })

    it('should handle empty string', () => {
      const result = stripAnsi('')
      expect(result).toBe('')
    })

    it('should remove multiple ANSI codes', () => {
      const colored =
        '\x1b[31mred\x1b[0m \x1b[32mgreen\x1b[0m \x1b[34mblue\x1b[0m'
      const result = stripAnsi(colored)
      expect(result).toBe('red green blue')
    })

    it('should remove bold formatting', () => {
      const bold = '\x1b[1mbold text\x1b[0m'
      const result = stripAnsi(bold)
      expect(result).toBe('bold text')
    })

    it('should remove underline formatting', () => {
      const underlined = '\x1b[4munderlined text\x1b[0m'
      const result = stripAnsi(underlined)
      expect(result).toBe('underlined text')
    })

    it('should remove dim formatting', () => {
      const dim = '\x1b[2mdim text\x1b[0m'
      const result = stripAnsi(dim)
      expect(result).toBe('dim text')
    })

    it('should remove italic formatting', () => {
      const italic = '\x1b[3mitalic text\x1b[0m'
      const result = stripAnsi(italic)
      expect(result).toBe('italic text')
    })

    it('should remove strikethrough formatting', () => {
      const strikethrough = '\x1b[9mstrikethrough text\x1b[0m'
      const result = stripAnsi(strikethrough)
      expect(result).toBe('strikethrough text')
    })

    it('should remove combined formatting', () => {
      const combined = '\x1b[1;31;4mbold red underlined\x1b[0m'
      const result = stripAnsi(combined)
      expect(result).toBe('bold red underlined')
    })

    it('should preserve text between codes', () => {
      const text = 'start \x1b[31mred\x1b[0m middle \x1b[32mgreen\x1b[0m end'
      const result = stripAnsi(text)
      expect(result).toBe('start red middle green end')
    })

    it('should handle nested codes', () => {
      const nested = '\x1b[31m\x1b[1mbold red\x1b[0m\x1b[0m'
      const result = stripAnsi(nested)
      expect(result).toBe('bold red')
    })

    it('should handle text with only codes', () => {
      const onlyCodes = '\x1b[31m\x1b[0m'
      const result = stripAnsi(onlyCodes)
      expect(result).toBe('')
    })

    it('should preserve newlines', () => {
      const multiline = '\x1b[31mline1\x1b[0m\nline2'
      const result = stripAnsi(multiline)
      expect(result).toBe('line1\nline2')
    })

    it('should preserve spaces', () => {
      const spaces = '\x1b[31m  spaced  text  \x1b[0m'
      const result = stripAnsi(spaces)
      expect(result).toBe('  spaced  text  ')
    })

    it('should handle long text with codes', () => {
      const long = `\x1b[31m${'a'.repeat(1000)}\x1b[0m`
      const result = stripAnsi(long)
      expect(result).toBe('a'.repeat(1000))
      expect(result.length).toBe(1000)
    })

    it('should remove 256 color codes', () => {
      const colored = '\x1b[38;5;123mcolored text\x1b[0m'
      const result = stripAnsi(colored)
      expect(result).toBe('colored text')
    })

    it('should remove background color codes', () => {
      const bg = '\x1b[41mred background\x1b[0m'
      const result = stripAnsi(bg)
      expect(result).toBe('red background')
    })

    it('should handle sequential codes without text', () => {
      const codes = '\x1b[31m\x1b[1m\x1b[4mtext\x1b[0m'
      const result = stripAnsi(codes)
      expect(result).toBe('text')
    })

    it('should preserve Unicode characters', () => {
      const unicode = '\x1b[31m世界\x1b[0m'
      const result = stripAnsi(unicode)
      expect(result).toBe('世界')
    })

    it('should preserve emoji', () => {
      const emoji = '\x1b[31m😀\x1b[0m'
      const result = stripAnsi(emoji)
      expect(result).toBe('😀')
    })

    it('should handle text with partial codes at boundaries', () => {
      const text = 'start\x1b[31mmiddle\x1b[0mend'
      const result = stripAnsi(text)
      expect(result).toBe('startmiddleend')
    })

    it('should handle consecutive reset codes', () => {
      const resets = 'text\x1b[0m\x1b[0m\x1b[0m'
      const result = stripAnsi(resets)
      expect(result).toBe('text')
    })

    it('should handle mixed formatting styles', () => {
      const mixed = '\x1b[1mBold\x1b[0m \x1b[2mDim\x1b[0m \x1b[3mItalic\x1b[0m'
      const result = stripAnsi(mixed)
      expect(result).toBe('Bold Dim Italic')
    })
  })

  describe('edge cases', () => {
    it('should handle very long ANSI sequences', () => {
      const regex = ansiRegex()
      const longSeq = '\x1b[38;5;1;2;3;4;5;6;7;8;9mtext\x1b[0m'
      expect(longSeq).toMatch(regex)
      const result = stripAnsi(longSeq)
      expect(result).toBe('text')
    })

    it('should handle malformed sequences gracefully', () => {
      const malformed = '\x1b[text\x1b[0m'
      const result = stripAnsi(malformed)
      expect(typeof result).toBe('string')
    })

    it('should handle text with backslashes', () => {
      const text = '\x1b[31mpath\\to\\file\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('path\\to\\file')
    })

    it('should handle text with special characters', () => {
      const special = '\x1b[31m$#@!%^&*()\x1b[0m'
      const result = stripAnsi(special)
      expect(result).toBe('$#@!%^&*()')
    })

    it('should handle mixed ANSI and non-ANSI escape sequences', () => {
      const mixed = '\x1b[31mred\x1b[0m\ttab\nline'
      const result = stripAnsi(mixed)
      expect(result).toBe('red\ttab\nline')
    })

    it('should handle strings starting with ANSI codes', () => {
      const text = '\x1b[31mstart'
      const result = stripAnsi(text)
      expect(result).toBe('start')
    })

    it('should handle strings ending with ANSI codes', () => {
      const text = 'end\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('end')
    })

    it('should handle alternating text and codes', () => {
      const alt = 'a\x1b[31mb\x1b[0mc\x1b[32md\x1b[0me'
      const result = stripAnsi(alt)
      expect(result).toBe('abcde')
    })

    it('should match OSC with complex parameters', () => {
      const regex = ansiRegex()
      const osc = '\x1b]0;window title with spaces\x07'
      expect(osc).toMatch(regex)
    })

    it('should handle zero-length text between codes', () => {
      const text = '\x1b[31m\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('')
    })

    it('should preserve carriage returns', () => {
      const text = '\x1b[31mline1\r\nline2\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('line1\r\nline2')
    })

    it('should handle null bytes', () => {
      const text = '\x1b[31mtext\x00with\x00nulls\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('text\x00with\x00nulls')
    })

    it('should strip codes from URLs', () => {
      const url = '\x1b[31mhttps://example.com/path?query=value\x1b[0m'
      const result = stripAnsi(url)
      expect(result).toBe('https://example.com/path?query=value')
    })

    it('should handle very long strings with many codes', () => {
      let text = ''
      for (let i = 0; i < 100; i++) {
        text += `\x1b[31mred${i}\x1b[0m `
      }
      const result = stripAnsi(text)
      expect(result).not.toContain('\x1b')
      expect(result).toContain('red0')
      expect(result).toContain('red99')
    })
  })
})
