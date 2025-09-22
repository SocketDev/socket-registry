declare function setToStringTag(
  obj: object,
  value: string,
  options?: {
    force?: boolean | undefined
    nonConfigurable?: boolean | undefined
  },
): void
export = setToStringTag
