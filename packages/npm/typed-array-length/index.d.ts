type AllPossibleTypedArrays = [
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'BigInt64Array',
  'BigUint64Array',
]
declare function typedArrayLength(value: typedArrayLength.TypedArray): number
declare function typedArrayLength(value: unknown): false
declare namespace typedArrayLength {
  type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array
  type TypedArrayName = AllPossibleTypedArrays[number]
}
export = typedArrayLength
