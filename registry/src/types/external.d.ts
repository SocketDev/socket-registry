/** @fileoverview Type declarations for external packages without @types packages. */

// Packages without DefinitelyTyped support
declare module 'libnpmpack' {
  export default function libnpmpack(spec: string, options?: any): any
}

// Add other missing types as needed
declare module '@npmcli/package-json/lib/read-package.js' {
  export default function readPackage(path: string): any
}

declare module '@npmcli/package-json/lib/sort.js' {
  export default function sort(packageJson: any): any
}
