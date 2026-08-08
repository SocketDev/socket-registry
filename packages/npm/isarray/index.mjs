// Vendored upstream `isarray`; the published ESM contract is a default
// export, and the named form is served too so both import shapes work.
const isArray = Array.isArray
// oxlint-disable-next-line socket/no-default-export -- vendored
export default isArray
export { isArray }
