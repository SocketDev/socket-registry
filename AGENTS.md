# Socket Registry

Use the Node version in `.node-version` and the pnpm version in `package.json`. Run commands from the repository root.

- Run `pnpm run check` for lint, types, and the registry build.
- Run `pnpm test` for registry and script tests. Run `pnpm run test:npm` for package compatibility tests.
- Keep generated build output out of commits. Use Conventional Commit subjects.
- Publish npm packages through their GitHub Actions workflows.
