declare interface InternalShared {
  builtinBufferExportsDescMap: { [x: string]: PropertyDescriptor }
}
declare const shared: InternalShared
export = shared
