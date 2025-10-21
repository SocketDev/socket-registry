/**
 * @fileoverview Tests for yocto-spinner NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: yoctoSpinner,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

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
})
