/**
 * @fileoverview Tests for word manipulation utilities.
 *
 * Validates capitalize, determineArticle, and pluralize functions.
 */

import {
  capitalize,
  determineArticle,
  pluralize,
} from '@socketsecurity/lib/words'
import { describe, expect, it } from 'vitest'

describe('words utilities', () => {
  describe('capitalize', () => {
    it('should capitalize first letter of lowercase word', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
    })

    it('should capitalize and lowercase rest', () => {
      expect(capitalize('hELLO')).toBe('Hello')
      expect(capitalize('WORLD')).toBe('World')
    })

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A')
      expect(capitalize('z')).toBe('Z')
    })

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle already capitalized words', () => {
      expect(capitalize('Hello')).toBe('Hello')
      expect(capitalize('World')).toBe('World')
    })

    it('should handle all uppercase words', () => {
      expect(capitalize('HELLO')).toBe('Hello')
    })

    it('should handle mixed case', () => {
      expect(capitalize('hElLo')).toBe('Hello')
      expect(capitalize('wOrLd')).toBe('World')
    })

    it('should handle words with numbers', () => {
      expect(capitalize('hello123')).toBe('Hello123')
    })

    it('should handle special characters', () => {
      expect(capitalize('hello-world')).toBe('Hello-world')
    })

    it('should handle Unicode characters', () => {
      expect(capitalize('café')).toBe('Café')
    })
  })

  describe('determineArticle', () => {
    it('should return "an" for words starting with vowels', () => {
      expect(determineArticle('apple')).toBe('an')
      expect(determineArticle('elephant')).toBe('an')
      expect(determineArticle('igloo')).toBe('an')
      expect(determineArticle('orange')).toBe('an')
      expect(determineArticle('umbrella')).toBe('an')
    })

    it('should return "a" for words starting with consonants', () => {
      expect(determineArticle('banana')).toBe('a')
      expect(determineArticle('cat')).toBe('a')
      expect(determineArticle('dog')).toBe('a')
      expect(determineArticle('tree')).toBe('a')
    })

    it('should be case-sensitive (lowercase vowels)', () => {
      expect(determineArticle('Apple')).toBe('a')
      expect(determineArticle('Elephant')).toBe('a')
    })

    it('should handle empty string', () => {
      expect(determineArticle('')).toBe('a')
    })

    it('should handle single vowel', () => {
      expect(determineArticle('a')).toBe('an')
      expect(determineArticle('e')).toBe('an')
    })

    it('should handle single consonant', () => {
      expect(determineArticle('b')).toBe('a')
      expect(determineArticle('z')).toBe('a')
    })

    it('should handle numbers', () => {
      expect(determineArticle('8-bit')).toBe('a')
      expect(determineArticle('5-star')).toBe('a')
    })

    it('should handle special characters', () => {
      expect(determineArticle('#hashtag')).toBe('a')
    })
  })

  describe('pluralize', () => {
    it('should not pluralize when count is 1', () => {
      expect(pluralize('cat', { count: 1 })).toBe('cat')
      expect(pluralize('dog', { count: 1 })).toBe('dog')
    })

    it('should pluralize when count is 0', () => {
      expect(pluralize('cat', { count: 0 })).toBe('cats')
      expect(pluralize('dog', { count: 0 })).toBe('dogs')
    })

    it('should pluralize when count is greater than 1', () => {
      expect(pluralize('cat', { count: 2 })).toBe('cats')
      expect(pluralize('dog', { count: 5 })).toBe('dogs')
    })

    it('should pluralize negative counts', () => {
      expect(pluralize('cat', { count: -1 })).toBe('cats')
      expect(pluralize('dog', { count: -5 })).toBe('dogs')
    })

    it('should pluralize decimal counts', () => {
      expect(pluralize('cat', { count: 1.5 })).toBe('cats')
      expect(pluralize('dog', { count: 0.5 })).toBe('dogs')
    })

    it('should default to singular when no count provided', () => {
      expect(pluralize('cat')).toBe('cat')
      expect(pluralize('dog')).toBe('dog')
    })

    it('should default to singular with empty options', () => {
      expect(pluralize('cat', {})).toBe('cat')
      expect(pluralize('dog', {})).toBe('dog')
    })

    it('should handle default count', () => {
      expect(pluralize('cat', {})).toBe('cat')
    })

    it('should add "s" for simple pluralization', () => {
      expect(pluralize('file', { count: 2 })).toBe('files')
      expect(pluralize('error', { count: 3 })).toBe('errors')
    })

    it('should handle words ending in "s"', () => {
      expect(pluralize('class', { count: 2 })).toBe('classs')
    })

    it('should handle words ending in "y"', () => {
      expect(pluralize('city', { count: 2 })).toBe('citys')
    })
  })

  describe('edge cases', () => {
    it('should handle capitalize with whitespace', () => {
      expect(capitalize(' hello')).toBe(' hello')
    })

    it('should handle determineArticle with whitespace prefix', () => {
      expect(determineArticle(' apple')).toBe('a')
    })

    it('should handle pluralize with very large count', () => {
      expect(pluralize('item', { count: 999_999 })).toBe('items')
    })

    it('should handle pluralize with Infinity', () => {
      expect(pluralize('item', { count: Number.POSITIVE_INFINITY })).toBe(
        'items',
      )
    })

    it('should handle pluralize with NaN', () => {
      expect(pluralize('item', { count: Number.NaN })).toBe('items')
    })
  })
})
