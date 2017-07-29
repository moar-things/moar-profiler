'use strict'

const fs = require('fs')

const standard = require('standard')

const moarProfiler = require('..')
const utils = require('./lib/utils')

const TestCode = fs.readFileSync(__filename, 'utf-8')

const runTest = utils.createTestRunner(__filename)

runTest(function basicRemote (t) {
  const inspectorPort = process.env.INSPECTOR_PORT

  if (inspectorPort == null) {
    t.fail('Expecting the env var INSPECTOR_PORT to be set to the port of an active inspector on localhost')
    t.end()
    return
  }

  const url = `http://localhost:${inspectorPort}`

  moarProfiler.profile(url, { duration: 1 }, (err, profile) => {
    if (err) {
      t.error(err, `error running profile: ${err}`)
      t.end()
      return
    }

    t.ok(profile.nodes, 'profile has a nodes object')
    t.ok(profile.scripts, 'profile has a scripts object')
    t.end()
  })
})

runTest(function runTestInProcess (t) {
  moarProfiler.profile(null, { duration: 1 }, (err, profile) => {
    if (err) {
      t.error(err, `error running profile: ${err}`)
      t.end()
      return
    }

    t.ok(profile.nodes, 'profile has a nodes object')
    t.ok(profile.scripts, 'profile has a scripts object')
    t.end()
  })

  keepBusy(1)
})

function keepBusy (seconds) {
  const start = Date.now()

  oneRun()

  function oneRun () {
    if (Date.now() - start > seconds * 1000) return

    standard.lintText(TestCode, () => {
      oneRun()
    })
  }
}
