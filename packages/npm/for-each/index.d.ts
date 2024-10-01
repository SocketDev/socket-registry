declare function forEach<T = unknown, This = undefined>(
  arr: T[],
  callback: (this: This, value: T, index: number, array: T[]) => void,
  thisArg?: This
): void
declare function forEach<V = unknown, This = undefined>(
  obj: Record<string, V>,
  callback: (this: This, value: V, key: string, obj: Record<string, V>) => void,
  thisArg?: This
): void
declare function forEach<This = undefined>(
  str: string,
  callback: (this: This, value: string, index: number, str: string) => void,
  thisArg: This
): void
export = forEach
