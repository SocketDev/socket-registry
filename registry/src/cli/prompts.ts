/**
 * @fileoverview Prompt utilities for Socket Registry v2.0.
 */

/**
 * Prompt for confirmation.
 */
export async function confirm(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  const { default: inquirerConfirm } = await import('@inquirer/confirm')
  return await inquirerConfirm({
    message,
    default: defaultValue,
  })
}

/**
 * Prompt for text input.
 */
export async function input(
  message: string,
  defaultValue?: string,
): Promise<string> {
  const { default: inquirerInput } = await import('@inquirer/input')
  return await inquirerInput({
    message,
    ...(defaultValue !== undefined && { default: defaultValue }),
  })
}

/**
 * Prompt for password input.
 */
export async function password(message: string): Promise<string> {
  const { default: inquirerPassword } = await import('@inquirer/password')
  return await inquirerPassword({
    message,
    mask: '*',
  })
}

/**
 * Prompt for selection from a list.
 */
export async function select<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T }>,
): Promise<T> {
  const { default: inquirerSelect } = await import('@inquirer/select')
  return await inquirerSelect({
    message,
    choices,
  })
}

/**
 * Prompt for searching from a list.
 */
export async function search<T extends string>(
  message: string,
  source: (
    input: string | undefined,
  ) => Promise<Array<{ name: string; value: T }>>,
): Promise<T> {
  const { default: inquirerSearch } = await import('@inquirer/search')
  return await inquirerSearch({
    message,
    source: async term => {
      const results = await source(term)
      return results
    },
  })
}
