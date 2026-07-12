declare function safeArrayConcat<T = unknown>(
  item: T | readonly T[],
  ...items: Array<T | readonly T[]>
): T[]
export = safeArrayConcat
