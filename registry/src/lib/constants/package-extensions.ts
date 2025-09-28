import yarnPkgExtensions from '../../external/@yarnpkg/extensions'

const { freeze: ObjectFreeze } = Object

export default ObjectFreeze(
  [
    yarnPkgExtensions.packageExtensions,
    [
      '@yarnpkg/extensions@>=1.1.0',
      {
        // Properties with undefined values are omitted when saved as JSON.
        peerDependencies: undefined,
      },
    ],
    [
      'abab@>=2.0.0',
      {
        devDependencies: {
          // Lower the Webpack from v4.x to one supported by abab's peers.
          webpack: '^3.12.0',
        },
      },
    ],
    [
      'is-generator-function@>=1.0.7',
      {
        scripts: {
          // Make the script a silent no-op.
          'test:uglified': '',
        },
      },
    ],
  ].sort((a_, b_) => {
    const aEntry = a_[0]
    const bEntry = b_[0]
    if (typeof aEntry !== 'string' || typeof bEntry !== 'string') {
      return 0
    }
    const a = aEntry.slice(0, aEntry.lastIndexOf('@'))
    const b = bEntry.slice(0, bEntry.lastIndexOf('@'))
    // Simulate the default compareFn of String.prototype.sort.
    if (a < b) {
      return -1
    }
    if (a > b) {
      return 1
    }
    return 0
  }),
)
