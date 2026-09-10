/**
 * @file Tests for yocto-spinner NPM package override.
 */

import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package.mts'

const {
  eco,
  module: yoctoSpinner,
  pkgPath,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should create spinner instance', () => {
    const spinner = yoctoSpinner()

    expect(spinner).toBeDefined()
    expect(typeof spinner.start).toBe('function')
    expect(typeof spinner.stop).toBe('function')
    expect(typeof spinner.success).toBe('function')
    expect(typeof spinner.error).toBe('function')
    expect(typeof spinner.warning).toBe('function')
  })

  it('should accept text option', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    expect(spinner).toBeDefined()
    expect(spinner.text).toBe('Loading')
  })

  it('should start and stop spinner', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    spinner.start()
    expect(spinner.isSpinning).toBe(true)

    spinner.stop()
    expect(spinner.isSpinning).toBe(false)
  })

  it('should support success state', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    spinner.start()
    const result = spinner.success('Done')

    expect(result).toBe(spinner)
    expect(spinner.isSpinning).toBe(false)
  })

  it('should support error state', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    spinner.start()
    const result = spinner.error('Failed')

    expect(result).toBe(spinner)
    expect(spinner.isSpinning).toBe(false)
  })

  it('should support warning state', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    spinner.start()
    const result = spinner.warning('Warning')

    expect(result).toBe(spinner)
    expect(spinner.isSpinning).toBe(false)
  })

  it('should allow text updates', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    spinner.start()
    expect(spinner.text).toBe('Loading')

    spinner.text = 'Updated'
    expect(spinner.text).toBe('Updated')

    spinner.stop()
  })

  it('should support custom spinner frames', () => {
    const customFrames = ['◐', '◓', '◑', '◒']
    const spinner = yoctoSpinner({
      text: 'Loading',
      spinner: {
        frames: customFrames,
        interval: 100,
      },
    })

    expect(spinner).toBeDefined()
    spinner.start()
    spinner.stop()
  })

  it('should clear spinner output', () => {
    const spinner = yoctoSpinner({ text: 'Loading' })

    spinner.start()
    const result = spinner.clear()

    expect(result).toBe(spinner)
    spinner.stop()
  })

  it('advances frames at the interval and suppresses callback-triggered rendering', () => {
    const createSpinner = require(path.join(pkgPath, 'index.cjs'))
    const writes: string[] = []
    const onFrameUpdate = vi.fn(() => {
      spinner.text = 'callback text'
    })
    const onRenderFrame = vi.fn(
      (frame: string, text: string) => `${frame}:${text}`,
    )
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
    const spinner = createSpinner({
      onFrameUpdate,
      onRenderFrame,
      spinner: { frames: ['first', 'second'], interval: 100 },
      stream: { isTTY: false, write: (text: string) => writes.push(text) },
      text: 'initial',
    })
    try {
      spinner.start()
      expect(writes).toStrictEqual(['first:callback text\n'])
      expect(onFrameUpdate).toHaveBeenCalledTimes(1)
      clock.mockReturnValue(1099)
      spinner.text = 'manual text'
      expect(onFrameUpdate).toHaveBeenCalledTimes(1)
      expect(writes.at(-1)).toBe('first:manual text\n')
      clock.mockReturnValue(1100)
      spinner.text = 'next text'
      expect(onFrameUpdate).toHaveBeenCalledTimes(2)
      expect(onRenderFrame).toHaveBeenCalledTimes(3)
      expect(writes.at(-1)).toBe('second:callback text\n')
      spinner.stop()
      spinner.text = 'stopped text'
      expect(onRenderFrame).toHaveBeenCalledTimes(3)
    } finally {
      spinner.stop()
      clock.mockRestore()
    }
  })
})
