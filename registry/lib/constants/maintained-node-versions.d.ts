interface MaintainedNodeVersions extends Array<string> {
  readonly last: string
  readonly previous: string
  readonly current: string
  readonly next: string
}
declare const maintainedNodeVersions: Readonly<MaintainedNodeVersions>
export = maintainedNodeVersions
