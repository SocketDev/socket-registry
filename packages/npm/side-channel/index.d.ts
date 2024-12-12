declare function getSideChannel<K, V>(): getSideChannel.Channel<K, V>
declare namespace getSideChannel {
  export type Channel<K, V> = {
    assert: (key: K) => void
    delete: (key: K) => boolean
    has: (key: K) => boolean
    get: (key: K) => V | undefined
    set: (key: K, value: V) => void
  }
}
export = getSideChannel
