import SUPPORTS_NODE_DISABLE_WARNING_FLAG from './SUPPORTS_NODE_DISABLE_WARNING_FLAG'

const { freeze: ObjectFreeze } = Object

export default ObjectFreeze(
  SUPPORTS_NODE_DISABLE_WARNING_FLAG
    ? [
        '--disable-warning',
        'DeprecationWarning',
        '--disable-warning',
        'ExperimentalWarning',
      ]
    : ['--no-warnings'],
)
