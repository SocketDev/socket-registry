// biome-ignore lint/complexity/noBannedTypes: Generic function type constraint.
declare function setFunctionLength<T extends Function>(
  fn: T,
  length: number,
  loose?: boolean | undefined,
): T
export = setFunctionLength
