export function encodeNpmRegistryName(name: string): string {
  const encoded = encodeURIComponent(name)
  return name.startsWith('@') ? `@${encoded.slice(3)}` : encoded
}
