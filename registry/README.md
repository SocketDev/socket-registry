# @socketsecurity/registry

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketsecurity/registry)](https://socket.dev/npm/package/@socketsecurity/registry)
[![CI](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

Query Socket Registry manifest data.

## Install

```bash
pnpm install @socketsecurity/registry
```

## Usage

```typescript
import { getManifestData } from '@socketsecurity/registry'

const pkg = getManifestData('npm', 'deep-equal')
console.log(pkg.name) // '@socketregistry/deep-equal'
console.log(pkg.version) // '1.0.22'
console.log(pkg.categories) // ['cleanup']
```

## License

MIT
