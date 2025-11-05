# Getting Started

**Quick start guide** — Create your first package override in 10 minutes.

---

## 📋 Prerequisites

```
Required:
 ✓ Node.js 20+ (LTS recommended)
 ✓ pnpm 9+
 ✓ Git

Optional:
 ✓ VS Code (recommended)
```

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/SocketDev/socket-registry.git
cd socket-registry

# Install dependencies
pnpm install

# Verify installation
pnpm test
```

**Expected output:**
```
✓ 140 tests passing
✓ 69% cumulative coverage
✓ Type coverage 82%
```

---

### 2. Project Structure

```
socket-registry/
├── overrides/              # Package overrides (the main content!)
│   ├── <category>/         # cleanup, levelup, speedup, tuneup
│   │   └── <package-name>/ # Individual override packages
│   │       ├── package.json
│   │       ├── index.js
│   │       └── test/
│   └── ...
│
├── registry/               # Registry support library
│   └── src/                # Helper functions and metadata
│
├── scripts/                # Build and generation scripts
│   ├── make-npm-override.mjs  # Scaffold new overrides
│   └── ...
│
└── docs/                   # Documentation
    ├── getting-started.md  # Contribution workflow
    ├── package-testing-guide.md
    └── test-helpers.md
```

---

### 3. Essential Commands

```bash
# Creating Overrides
pnpm run make:npm-override <package>  # Scaffold new override
pnpm run make:npm-override            # Interactive mode

# Development
pnpm build                # Build all overrides
pnpm test                 # Run all tests
pnpm run cover            # Run with coverage

# Quality
pnpm run check            # Type check
pnpm run lint             # Lint code
pnpm run fix              # Auto-fix issues

# Testing Specific Override
cd overrides/cleanup/package-name
pnpm test                 # Test this override only
```

---

## 🎯 Override Categories

```
Cleanup ✨  → Reduce dependencies, use built-ins
Levelup 🧩  → Add features, modern APIs
Speedup ⚡  → Optimize performance
Tuneup  🔧  → Fix CVEs, maintain compatibility
```

**Choose the right category for your override!**

---

## 🏗️ Creating Your First Override

### Step 1: Generate Scaffold

```bash
pnpm run make:npm-override package-name
```

**Interactive prompts:**
1. Choose override category (cleanup/levelup/speedup/tuneup)
2. Provide package description
3. Scaffold is created in `overrides/<category>/<package-name>/`

### Step 2: Implement Override

Edit the generated files:

```javascript
// overrides/<category>/<package-name>/index.js
'use strict'

// TODO: Implement improved version
// - Use built-in APIs where possible
// - Reduce dependencies
// - Optimize performance
// - Maintain API compatibility!

module.exports = {
  // Your implementation here
}
```

### Step 3: Add Tests

```javascript
// overrides/<category>/<package-name>/test/index.test.js
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const pkg = require('..')

describe('<package-name>', () => {
  it('maintains API compatibility', () => {
    // Test original package behavior
    assert.equal(pkg.someFunction(), expectedValue)
  })

  it('works with edge cases', () => {
    // Add comprehensive tests
  })
})
```

### Step 4: Verify Compatibility

```bash
# Run tests against BOTH original and override
cd overrides/<category>/<package-name>
pnpm test

# Tests must pass to prove compatibility!
```

---

## 🧪 Testing Philosophy

**Golden Rule:** Your override must pass the **original package's tests**.

This proves API compatibility and prevents breaking changes.

**Test checklist:**
- [ ] All original package tests pass
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] TypeScript types included

---

## 💡 Development Workflow

### Complete Override Process

```
1. Scaffold          → pnpm run make:npm-override <package>
2. Research          → Read original package code
3. Implement         → Write improved version
4. Test              → Verify compatibility (100%)
5. Document          → Add usage examples
6. Verify            → pnpm run check && pnpm test
7. Commit            → Conventional commit format
8. PR                → Submit for review
```

### Commit Message Format

```
type(scope): description

Examples:
  feat(cleanup/lodash.get): add built-in alternative
  fix(speedup/uuid): handle edge case in v4()
  docs(levelup/fs-extra): add usage examples
  test(tuneup/axios): add security tests
```

---

## 📚 Key Concepts

### 1. Compatibility is Critical

Your override **must** maintain the original package's API:
- Same function signatures
- Same return values
- Same error behavior

### 2. License Compatibility

All overrides must:
- Retain original license
- Be MIT compatible
- Credit original authors

### 3. TypeScript Support

All overrides must include TypeScript definitions:

```typescript
// index.d.ts
export function someFunction(arg: string): number
```

### 4. Node.js Version Support

Support current and LTS Node.js versions (20+).

---

## 🔧 Common Patterns

### Using Built-in Alternatives

```javascript
// ✓ Replace polyfills with built-ins
const { promisify } = require('node:util')
const fs = require('node:fs/promises')

// ✗ Don't add unnecessary dependencies
// const bluebird = require('bluebird')  // Avoid!
```

### Reducing Dependencies

```javascript
// ✓ Use native APIs
const path = require('node:path')

// ✗ Don't pull in heavy deps
// const _ = require('lodash')  // Only if necessary!
```

---

## 📖 Additional Resources

- [Getting Started](./getting-started.md) - Detailed contribution guide
- [Package Testing Guide](./package-testing-guide.md) - Testing strategies
- [Test Helpers](./test-helpers.md) - Testing utilities
- [CLAUDE.md](../CLAUDE.md) - Development standards

---

## 🆘 Getting Help

- **Issues:** [GitHub Issues](https://github.com/SocketDev/socket-registry/issues)
- **Questions:** Ask in PR comments
- **Standards:** Check [CLAUDE.md](../CLAUDE.md)

---

## ✅ Checklist for First Override

- [ ] Ran `pnpm install` successfully
- [ ] Read [docs/getting-started.md](./getting-started.md)
- [ ] Understand override categories (cleanup/levelup/speedup/tuneup)
- [ ] Know how to scaffold: `pnpm run make:npm-override`
- [ ] Understand compatibility requirement (original tests must pass)
- [ ] Know commit format (conventional commits)
- [ ] Ready to create your first override!

**Welcome to socket-registry!** 🎉
