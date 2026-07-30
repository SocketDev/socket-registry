declare function ToPrimitive(
  input: unknown,
  PreferredType?: StringConstructor | NumberConstructor,
): string | number | boolean | symbol | bigint | null | undefined
export = ToPrimitive
