import { beforeEach, describe, expect, it, vi } from 'vitest'

import { wrapPrompt } from '../../registry/dist/lib/prompts.js'

describe('prompts module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('wrapPrompt', () => {
    it('should wrap a prompt function and trim string results', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('  test result  ')
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBe('test result')
      expect(mockPrompt).toHaveBeenCalledWith(
        { message: 'test' },
        expect.objectContaining({ signal: expect.anything() }),
      )
    })

    it('should pass through non-string results unchanged', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(42)
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBe(42)
    })

    it('should pass through boolean results unchanged', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(true)
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'confirm?' }, { spinner: null })

      expect(result).toBe(true)
    })

    it('should pass through array results unchanged', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(['a', 'b', 'c'])
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'select' }, { spinner: null })

      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should inject abort signal when no context provided', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('result')
      const wrapped = wrapPrompt(mockPrompt)

      await wrapped({ message: 'test' }, { spinner: null })

      expect(mockPrompt).toHaveBeenCalledWith(
        { message: 'test' },
        expect.objectContaining({
          signal: expect.any(Object),
        }),
      )
    })

    it('should merge signal with existing context', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('result')
      const wrapped = wrapPrompt(mockPrompt)

      await wrapped(
        { message: 'test' },
        { clearPromptOnDone: true, spinner: null },
      )

      expect(mockPrompt).toHaveBeenCalledWith(
        { message: 'test' },
        expect.objectContaining({
          signal: expect.any(Object),
          clearPromptOnDone: true,
        }),
      )
    })

    it('should rethrow TypeError', async () => {
      const mockPrompt = vi.fn().mockRejectedValue(new TypeError('test error'))
      const wrapped = wrapPrompt(mockPrompt)

      await expect(
        wrapped({ message: 'test' }, { spinner: null }),
      ).rejects.toThrow(TypeError)
      await expect(
        wrapped({ message: 'test' }, { spinner: null }),
      ).rejects.toThrow('test error')
    })

    it('should suppress non-TypeError errors', async () => {
      const mockPrompt = vi.fn().mockRejectedValue(new Error('regular error'))
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBeUndefined()
    })

    it('should handle mock spinner that is not spinning', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('result')
      const wrapped = wrapPrompt(mockPrompt)
      const mockSpinner = {
        isSpinning: false,
        stop: vi.fn(),
        start: vi.fn(),
      }

      await wrapped({ message: 'test' }, { spinner: mockSpinner })

      expect(mockSpinner.stop).toHaveBeenCalled()
      expect(mockSpinner.start).not.toHaveBeenCalled()
    })

    it('should handle mock spinner that is spinning', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('result')
      const wrapped = wrapPrompt(mockPrompt)
      const mockSpinner = {
        isSpinning: true,
        stop: vi.fn(),
        start: vi.fn(),
      }

      await wrapped({ message: 'test' }, { spinner: mockSpinner })

      expect(mockSpinner.stop).toHaveBeenCalled()
      expect(mockSpinner.start).toHaveBeenCalled()
    })

    it('should trim string with only spaces', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('     ')
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBe('')
    })

    it('should handle empty string', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('')
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBe('')
    })

    it('should handle undefined result', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(undefined)
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBeUndefined()
    })

    it('should handle null result', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(null)
      const wrapped = wrapPrompt(mockPrompt)

      const result = await wrapped({ message: 'test' }, { spinner: null })

      expect(result).toBeNull()
    })

    it('should inject signal when called with only message argument', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('result')
      const wrapped = wrapPrompt(mockPrompt)

      await wrapped({ message: 'test' })

      expect(mockPrompt).toHaveBeenCalledWith(
        { message: 'test' },
        expect.objectContaining({
          signal: expect.any(Object),
        }),
      )
    })
  })

  describe('module exports', () => {
    it('should export prompt functions', () => {
      const prompts = require('../../registry/dist/lib/prompts')

      expect(typeof prompts.confirm).toBe('function')
      expect(typeof prompts.input).toBe('function')
      expect(typeof prompts.password).toBe('function')
      expect(typeof prompts.search).toBe('function')
      expect(typeof prompts.select).toBe('function')
      expect(prompts.Separator).toBeDefined()
    })

    it('should have Separator constructor', () => {
      const { Separator } = require('../../registry/dist/lib/prompts')

      // Test that we can construct it (though we won't test the internal logic)
      expect(() => new Separator()).not.toThrow()
      expect(() => new Separator('custom')).not.toThrow()
    })
  })
})
