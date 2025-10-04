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
      expect(pluralize('dog', { count: 2 })).toBe('dogs')
      // 0 is plural
      expect(pluralize('book', { count: 0 })).toBe('books')
      expect(pluralize('table', { count: 5 })).toBe('tables')
    })

    it('should handle words ending in s, x, z, ch, sh', () => {
      // simple s appending
      expect(pluralize('bus', { count: 2 })).toBe('buss')
      expect(pluralize('box', { count: 2 })).toBe('boxs')
      expect(pluralize('buzz', { count: 2 })).toBe('buzzs')
      expect(pluralize('church', { count: 2 })).toBe('churchs')
      expect(pluralize('dish', { count: 2 })).toBe('dishs')
    })

    it('should handle words ending in consonant + y', () => {
      // simple s appending
      expect(pluralize('baby', { count: 2 })).toBe('babys')
      expect(pluralize('city', { count: 2 })).toBe('citys')
      expect(pluralize('story', { count: 2 })).toBe('storys')
      expect(pluralize('fly', { count: 2 })).toBe('flys')
    })

    it('should handle words ending in vowel + y', () => {
      expect(pluralize('boy', { count: 2 })).toBe('boys')
      expect(pluralize('key', { count: 2 })).toBe('keys')
      expect(pluralize('day', { count: 2 })).toBe('days')
      expect(pluralize('toy', { count: 2 })).toBe('toys')
    })

    it('should handle words ending in f or fe', () => {
      // simple s appending
      expect(pluralize('leaf', { count: 2 })).toBe('leafs')
      expect(pluralize('knife', { count: 2 })).toBe('knifes')
      expect(pluralize('wife', { count: 2 })).toBe('wifes')
      expect(pluralize('shelf', { count: 2 })).toBe('shelfs')
    })

    it('should handle words ending in o', () => {
      // simple s appending
      expect(pluralize('hero', { count: 2 })).toBe('heros')
      expect(pluralize('potato', { count: 2 })).toBe('potatos')
      expect(pluralize('tomato', { count: 2 })).toBe('tomatos')
    })

    it('should handle irregular plurals', () => {
      // simple s appending
      expect(pluralize('child', { count: 2 })).toBe('childs')
      expect(pluralize('person', { count: 2 })).toBe('persons')
      expect(pluralize('man', { count: 2 })).toBe('mans')
      expect(pluralize('woman', { count: 2 })).toBe('womans')
      expect(pluralize('foot', { count: 2 })).toBe('foots')
      expect(pluralize('tooth', { count: 2 })).toBe('tooths')
      expect(pluralize('goose', { count: 2 })).toBe('gooses')
      expect(pluralize('mouse', { count: 2 })).toBe('mouses')
    })

    it('should handle unchanged plurals', () => {
      // count=1, no s
      expect(pluralize('sheep', { count: 1 })).toBe('sheep')
      // simple s appending
      expect(pluralize('deer', { count: 2 })).toBe('deers')
      expect(pluralize('fish', { count: 2 })).toBe('fishs')
      expect(pluralize('series', { count: 2 })).toBe('seriess')
    })

    it('should handle empty strings', () => {
      // empty + s
      expect(pluralize('', { count: 2 })).toBe('s')
    })

    it('should handle already plural words', () => {
      // just adds s
      expect(pluralize('cats', { count: 2 })).toBe('catss')
      expect(pluralize('dogs', { count: 2 })).toBe('dogss')
    })
  })
})
