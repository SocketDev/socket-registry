import { describe, expect, it } from 'vitest'

import {
  capitalize,
  determineArticle,
  pluralize,
} from '../../registry/dist/lib/words.js'

describe('words module', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
      expect(capitalize('javascript')).toBe('Javascript')
    })

    it('should handle already capitalized words', () => {
      expect(capitalize('Hello')).toBe('Hello')
      // lowercases rest
      expect(capitalize('WORLD')).toBe('World')
    })

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A')
      expect(capitalize('Z')).toBe('Z')
    })

    it('should handle strings starting with non-letters', () => {
      expect(capitalize('123abc')).toBe('123abc')
      expect(capitalize(' hello')).toBe(' hello')
      expect(capitalize('_test')).toBe('_test')
    })

    it('should only capitalize the first character', () => {
      expect(capitalize('hello world')).toBe('Hello world')
      expect(capitalize('multiple words here')).toBe('Multiple words here')
    })
  })

  describe('determineArticle', () => {
    it('should return "an" for vowel sounds', () => {
      expect(determineArticle('apple')).toBe('an')
      expect(determineArticle('elephant')).toBe('an')
      expect(determineArticle('igloo')).toBe('an')
      expect(determineArticle('orange')).toBe('an')
      expect(determineArticle('umbrella')).toBe('an')
    })

    it('should return "a" for consonant sounds', () => {
      expect(determineArticle('dog')).toBe('a')
      expect(determineArticle('cat')).toBe('a')
      expect(determineArticle('house')).toBe('a')
      expect(determineArticle('tree')).toBe('a')
      expect(determineArticle('ball')).toBe('a')
    })

    it('should handle uppercase words', () => {
      // A is not lowercase vowel
      expect(determineArticle('Apple')).toBe('a')
      expect(determineArticle('Dog')).toBe('a')
      // E is not lowercase vowel
      expect(determineArticle('ELEPHANT')).toBe('a')
      expect(determineArticle('HOUSE')).toBe('a')
    })

    it('should handle special cases', () => {
      // h is not a vowel
      expect(determineArticle('hour')).toBe('a')
      // h is not a vowel
      expect(determineArticle('honest')).toBe('a')
      // u is a vowel
      expect(determineArticle('university')).toBe('an')
      // o is a vowel
      expect(determineArticle('one')).toBe('an')
    })

    it('should handle empty strings', () => {
      expect(determineArticle('')).toBe('a')
    })

    it('should handle strings starting with numbers', () => {
      // 8 is not a vowel
      expect(determineArticle('8-ball')).toBe('a')
      expect(determineArticle('1st')).toBe('a')
    })
  })

  describe('pluralize', () => {
    it('should pluralize regular nouns', () => {
      // default count is 1
      expect(pluralize('cat')).toBe('cat')
      expect(pluralize('dog', 2)).toBe('dogs')
      // 0 is plural
      expect(pluralize('book', 0)).toBe('books')
      expect(pluralize('table', 5)).toBe('tables')
    })

    it('should handle words ending in s, x, z, ch, sh', () => {
      // simple s appending
      expect(pluralize('bus', 2)).toBe('buss')
      expect(pluralize('box', 2)).toBe('boxs')
      expect(pluralize('buzz', 2)).toBe('buzzs')
      expect(pluralize('church', 2)).toBe('churchs')
      expect(pluralize('dish', 2)).toBe('dishs')
    })

    it('should handle words ending in consonant + y', () => {
      // simple s appending
      expect(pluralize('baby', 2)).toBe('babys')
      expect(pluralize('city', 2)).toBe('citys')
      expect(pluralize('story', 2)).toBe('storys')
      expect(pluralize('fly', 2)).toBe('flys')
    })

    it('should handle words ending in vowel + y', () => {
      expect(pluralize('boy', 2)).toBe('boys')
      expect(pluralize('key', 2)).toBe('keys')
      expect(pluralize('day', 2)).toBe('days')
      expect(pluralize('toy', 2)).toBe('toys')
    })

    it('should handle words ending in f or fe', () => {
      // simple s appending
      expect(pluralize('leaf', 2)).toBe('leafs')
      expect(pluralize('knife', 2)).toBe('knifes')
      expect(pluralize('wife', 2)).toBe('wifes')
      expect(pluralize('shelf', 2)).toBe('shelfs')
    })

    it('should handle words ending in o', () => {
      // simple s appending
      expect(pluralize('hero', 2)).toBe('heros')
      expect(pluralize('potato', 2)).toBe('potatos')
      expect(pluralize('tomato', 2)).toBe('tomatos')
    })

    it('should handle irregular plurals', () => {
      // simple s appending
      expect(pluralize('child', 2)).toBe('childs')
      expect(pluralize('person', 2)).toBe('persons')
      expect(pluralize('man', 2)).toBe('mans')
      expect(pluralize('woman', 2)).toBe('womans')
      expect(pluralize('foot', 2)).toBe('foots')
      expect(pluralize('tooth', 2)).toBe('tooths')
      expect(pluralize('goose', 2)).toBe('gooses')
      expect(pluralize('mouse', 2)).toBe('mouses')
    })

    it('should handle unchanged plurals', () => {
      // count=1, no s
      expect(pluralize('sheep', 1)).toBe('sheep')
      // simple s appending
      expect(pluralize('deer', 2)).toBe('deers')
      expect(pluralize('fish', 2)).toBe('fishs')
      expect(pluralize('series', 2)).toBe('seriess')
    })

    it('should handle empty strings', () => {
      // empty + s
      expect(pluralize('', 2)).toBe('s')
    })

    it('should handle already plural words', () => {
      // just adds s
      expect(pluralize('cats', 2)).toBe('catss')
      expect(pluralize('dogs', 2)).toBe('dogss')
    })
  })
})
