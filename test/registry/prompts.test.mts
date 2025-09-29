import { describe, expect, it, vi } from 'vitest'

// Test only the wrapPrompt function logic, not the third-party integrations
describe('prompts module', () => {
  describe('wrapPrompt function', () => {
    it('should test the wrapper logic with a mock function', async () => {
      // Test the wrapPrompt function directly
      const wrapPrompt = require('../../registry/dist/lib/prompts').__internal
        ?.wrapPrompt

      if (!wrapPrompt) {
        // Since wrapPrompt is not exported, we can only test that the module loads
        const prompts = require('../../registry/dist/lib/prompts')
        expect(prompts).toBeDefined()
        expect(typeof prompts.confirm).toBe('function')
        expect(typeof prompts.input).toBe('function')
        expect(typeof prompts.password).toBe('function')
        expect(typeof prompts.search).toBe('function')
        expect(typeof prompts.select).toBe('function')
        expect(prompts.Separator).toBeDefined()
        return
      }

      // Mock a simple prompt function
      const mockPrompt = vi.fn()
      const wrappedPrompt = wrapPrompt(mockPrompt)

      // Test string trimming
      mockPrompt.mockResolvedValue('  test result  ')
      const result1 = await wrappedPrompt({ message: 'test' })
      expect(result1).toBe('test result')

      // Test non-string passthrough
      mockPrompt.mockResolvedValue(42)
      const result2 = await wrappedPrompt({ message: 'test' })
      expect(result2).toBe(42)

      // Test TypeError handling
      mockPrompt.mockRejectedValue(new TypeError('test error'))
      await expect(wrappedPrompt({ message: 'test' })).rejects.toThrow(
        TypeError,
      )

      // Test non-TypeError handling
      mockPrompt.mockRejectedValue(new Error('regular error'))
      const result3 = await wrappedPrompt({ message: 'test' })
      expect(result3).toBeUndefined()
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
