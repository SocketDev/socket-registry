declare function whichBoxedPrimitive(value: bigint): 'BigInt'
declare function whichBoxedPrimitive(value: boolean): 'Boolean'
declare function whichBoxedPrimitive(value: number): 'Number'
declare function whichBoxedPrimitive(value: string): 'String'
declare function whichBoxedPrimitive(value: symbol): 'Symbol'
declare function whichBoxedPrimitive(
  value: bigint | boolean | null | number | string | symbol | undefined,
): null
declare function whichBoxedPrimitive(value: unknown): undefined
export = whichBoxedPrimitive
