declare const {
  x: ObjectKeys,
}: {
  x: typeof Object.keys & {
    shim(): () => typeof Object.keys
  }
}
export = ObjectKeys
