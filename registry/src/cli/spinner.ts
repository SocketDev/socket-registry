/**
 * @fileoverview Spinner utilities for Socket Registry v2.0.
 */

/**
 * Create a CLI spinner.
 */
export async function createSpinner(text: string) {
  const { default: yoctoSpinner } = await import('@socketregistry/yocto-spinner')

  const spinner = yoctoSpinner({
    text,
    stream: process.stdout,
  })

  return {
    start() {
      spinner.start()
      return this
    },

    stop() {
      spinner.stop()
      return this
    },

    succeed(text?: string) {
      spinner.success(text)
      return this
    },

    fail(text?: string) {
      spinner.error(text)
      return this
    },

    warn(text?: string) {
      spinner.warning(text)
      return this
    },

    info(text?: string) {
      spinner.info(text)
      return this
    },

    updateText(text: string) {
      spinner.text = text
      return this
    },

    isSpinning() {
      return spinner.isSpinning
    },
  }
}

/**
 * Run a function with a spinner.
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>
): Promise<T> {
  const spinner = await createSpinner(text)
  spinner.start()

  try {
    const result = await fn()
    spinner.succeed()
    return result
  } catch (error) {
    spinner.fail()
    throw error
  }
}