// biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
export function eastAsianWidth(
  codePoint: number,
  options?: { ambiguousAsWide?: boolean },
): number
export function eastAsianWidthType(codePoint: number): string
