'use strict'

// code to run a profiler against; see ./profile.js

exports.run = run

const fs = require('fs')
const standard = require('standard')

const Concurrent = 10
const TestCode = fs.readFileSync(__filename, 'utf-8')

function run (ms) {
  const start = Date.now()

  for (let i = 0; i < Concurrent; i++) oneRun()

  function oneRun () {
    if (Date.now() - start > ms) return

    standard.lintText(TestCode, (err, results) => {
      if (err) return console.log(`${__filename}: error running standard:`, err)
      // const message = err ? `error: ${err}` : `standard errors: ${results.errorCount}`
      // console.error(new Date(), message)
      oneRun()
    })
  }
}

if (require.main === module) {
  console.error(`calling standard for 30 seconds`)
  run(30 * 1000)
}
