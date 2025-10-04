import {
  execBin,
  findRealBin,
  findRealNpm,
  findRealPnpm,
  findRealYarn,
  isShadowBinPath,
  resolveBinPathSync,
  whichBin,
  whichBinSync,
} from '../../registry/dist/lib/bin.js'

const testName = process.argv[2]

async function main() {
  try {
    if (testName === 'whichBin-node') {
      const result = await whichBin('node')
      console.log('whichBin result:', result)
    } else if (testName === 'whichBin-not-found') {
      const result = await whichBin('nonexistent-binary-xyz')
      console.log('whichBin result:', result)
    } else if (testName === 'whichBin-all') {
      const result = await whichBin('node', { all: true })
      console.log('whichBin all:', Array.isArray(result))
    } else if (testName === 'whichBinSync-node') {
      const result = whichBinSync('node')
      console.log('whichBinSync result:', result)
    } else if (testName === 'whichBinSync-not-found') {
      const result = whichBinSync('nonexistent-binary-xyz')
      console.log('whichBinSync result:', result)
    } else if (testName === 'execBin-node') {
      await execBin('node', ['--version'])
      console.log('execBin completed')
    } else if (testName === 'execBin-not-found') {
      try {
        await execBin('nonexistent-binary-xyz', [])
      } catch (err) {
        console.log('execBin error:', err.code, err.message)
      }
    } else if (testName === 'resolveBinPathSync') {
      const result = resolveBinPathSync('./node_modules/.bin/vitest')
      console.log('resolveBinPathSync:', result !== undefined)
    } else if (testName === 'isShadowBinPath') {
      const result = isShadowBinPath('./node_modules/.bin')
      console.log('isShadowBinPath:', result)
    } else if (testName === 'findRealBin') {
      const result = await findRealBin('node')
      console.log('findRealBin:', result !== undefined)
    } else if (testName === 'findRealNpm') {
      const result = findRealNpm()
      console.log('findRealNpm:', result !== undefined)
    } else if (testName === 'findRealPnpm') {
      const result = findRealPnpm()
      console.log('findRealPnpm:', result !== undefined)
    } else if (testName === 'findRealYarn') {
      const result = findRealYarn()
      console.log('findRealYarn:', result !== undefined)
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

main()
