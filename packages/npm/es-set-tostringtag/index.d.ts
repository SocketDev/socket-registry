declare function setToStringTag(
  obj: object,
  value: string,
  options?: {
    force?: boolean
    nonConfigurable?: boolean
  }
): void
export = setToStringTag
