# @socketregistry

[![CI - SocketDev/socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A collection of [Socket.dev](https://socket.dev/) optimize package overrides
> for use with [`@socketregistry/cli`](https://docs.socket.dev/docs/socket-cli).

## About

In the spirit of the [e18e](https://e18e.dev/) initiative each override may fit
into one or more of the following categories:

- Cleanup ✨ — _Reduces dependencies by replacing with stubs. For instance,
  polyfills are replaced by their built-in counterparts._
- Levelup 🧩 — _Adds new features and uses the latest platform APIs._
- Speedup ⚡ — _Focuses on performance. Gotta go blazingly lightning fast._
- Tuneup 🔧 — _Address CVE vulnerabilities, especially in packages that are low
  to no maintained, providing secure, reliable alternatives._

Each override is

- 💯 tested against the original package's unit tests to ensure compatibility
- Interopbable with CommonJS
- Ships with
  <a href="https://www.typescriptlang.org/"><img src="./ts.svg" height="20px" title="This package contains built-in TypeScript declarations" alt="TypeScript icon, indicating that this package has built-in type declarations"></a>
  TypeScript types
- Supports current and [LTS](https://nodejs.org/en/about/previous-releases) Node
  versions

## Contribute

To create an npm ecosystem package override

- Initialize this repository with your favorite package manager, e.g.
  `npm install`.
- Run

```bash
npm run make:npm-package
```

- Follow the prompts to create the scaffolding for your shiny new override.
- Fill in all `TODO:` commented sections.
- Commit and send a pull request!
