'use strict'

const { existsSync } = require('node:fs')
const path = require('node:path')

const yargsParser = require('yargs-parser')
const colors = require('yoctocolors-cjs')

const constants = require('@socketsecurity/registry/lib/constants')
const { readJson } = require('@socketsecurity/registry/lib/fs')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { isObjectObject } = require('@socketsecurity/registry/lib/objects')
const { spawn } = require('@socketsecurity/registry/lib/spawn')

const indent = '  '

function countCovered(counts) {
  return counts.filter(count => count > 0).length
}

async function logCoveragePercentage(argv) {
  const { spinner } = constants

  const coverageJsonPath = path.join(
    process.cwd(),
    'coverage',
    'coverage-final.json',
  )

  if (!existsSync(coverageJsonPath)) {
    spinner.start('Generating coverage data...')

    let result
    try {
      result = await spawn('pnpm', ['run', 'test:unit:coverage'], {
        stdio: 'ignore',
        shell: constants.WIN32,
      })
    } catch (error) {
      spinner.stop()
      logger.error('Spawn error:', error)
      throw new Error(`Failed to generate coverage data: ${error.message}`)
    }

    spinner.stop()

    if (result.code) {
      logger.error(`Exit code: ${result.code}`)
      throw new Error('Failed to generate coverage data')
    }
  }

  const coverageData = await readJson(coverageJsonPath, { throws: false })
  if (!isObjectObject(coverageData)) {
    throw new Error('Error reading coverage data')
  }

  let coveredBranches = 0
  let coveredFunctions = 0
  let coveredLines = 0
  let coveredStatements = 0
  let totalBranches = 0
  let totalFunctions = 0
  let totalLines = 0
  let totalStatements = 0

  for (const coverage of Object.values(coverageData)) {
    // Statements.
    coveredStatements += countCovered(Object.values(coverage.s))
    totalStatements += Object.keys(coverage.s).length

    // Branches.
    for (const branchId in coverage.b) {
      const branches = coverage.b[branchId]
      coveredBranches += countCovered(branches)
      totalBranches += branches.length
    }

    // Functions.
    coveredFunctions += countCovered(Object.values(coverage.f))
    totalFunctions += Object.keys(coverage.f).length

    // Lines (using statement map for line coverage).
    const linesCovered = new Set()
    const linesTotal = new Set()
    for (const stmtId in coverage.statementMap) {
      const stmt = coverage.statementMap[stmtId]
      const line = stmt.start.line
      linesTotal.add(line)
      if (coverage.s[stmtId] > 0) {
        linesCovered.add(line)
      }
    }
    coveredLines += linesCovered.size
    totalLines += linesTotal.size
  }

  const stmtPercent =
    totalStatements > 0
      ? ((coveredStatements / totalStatements) * 100).toFixed(2)
      : '0.00'
  const branchPercent =
    totalBranches > 0
      ? ((coveredBranches / totalBranches) * 100).toFixed(2)
      : '0.00'
  const funcPercent =
    totalFunctions > 0
      ? ((coveredFunctions / totalFunctions) * 100).toFixed(2)
      : '0.00'
  const linePercent =
    totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(2) : '0.00'

  // Calculate overall percentage (average of all metrics).
  const overall = (
    (parseFloat(stmtPercent) +
      parseFloat(branchPercent) +
      parseFloat(funcPercent) +
      parseFloat(linePercent)) /
    4
  ).toFixed(2)

  const overallNum = parseFloat(overall)
  let emoji = ''
  if (overallNum >= 99) {
    emoji = ' 🚀'
  } else if (overallNum >= 95) {
    emoji = ' 🎯'
  } else if (overallNum >= 90) {
    emoji = ' ✨'
  } else if (overallNum >= 80) {
    emoji = ' 💪'
  } else if (overallNum >= 70) {
    emoji = ' 📈'
  } else if (overallNum >= 60) {
    emoji = ' ⚡'
  } else if (overallNum >= 50) {
    emoji = ' 🔨'
  } else {
    emoji = ' ⚠️'
  }

  if (argv.json) {
    logger.log(
      JSON.stringify(
        {
          statements: {
            percent: stmtPercent,
            covered: coveredStatements,
            total: totalStatements,
          },
          branches: {
            percent: branchPercent,
            covered: coveredBranches,
            total: totalBranches,
          },
          functions: {
            percent: funcPercent,
            covered: coveredFunctions,
            total: totalFunctions,
          },
          lines: {
            percent: linePercent,
            covered: coveredLines,
            total: totalLines,
          },
          overall: overall,
        },
        null,
        2,
      ),
    )
  } else if (argv.simple) {
    logger.log(stmtPercent)
  } else {
    logger.info(`Coverage Summary:`)
    logger.info(
      `${indent}Statements: ${stmtPercent}% (${coveredStatements}/${totalStatements})`,
    )
    logger.info(
      `${indent}Branches:   ${branchPercent}% (${coveredBranches}/${totalBranches})`,
    )
    logger.info(
      `${indent}Functions:  ${funcPercent}% (${coveredFunctions}/${totalFunctions})`,
    )
    logger.info(
      `${indent}Lines:      ${linePercent}% (${coveredLines}/${totalLines})`,
    )
    logger.info('')
    logger.info(colors.bold(`Current coverage: ${overall}% overall!${emoji}`))
  }
}

void (async () => {
  const argv = yargsParser(process.argv.slice(2), {
    boolean: ['json', 'simple'],
    alias: {
      j: 'json',
      s: 'simple',
    },
  })
  await logCoveragePercentage(argv)
})()
