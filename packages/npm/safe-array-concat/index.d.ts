declare function safeArrayConcat<T = unknown>(
  item: T | T[],
  ...items: Array<T | T[]>
): T[]
export = safeArrayConcat
