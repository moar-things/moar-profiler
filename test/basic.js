'use strict'

const moarProfiler = require('..')
const utils = require('./lib/utils')

const profileTestCode = require('./profile-test-code')

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

    validateProfile(t, profile)
    t.end()

    profile.timeDeltas = []
    profile.samples = []
  })
})

runTest(function runTestInProcess (t) {
  profileTestCode.run(2000)

  moarProfiler.profile(null, { duration: 1 }, (err, profile) => {
    if (err) {
      t.error(err, `error running profile: ${err}`)
      t.end()
      return
    }

    validateProfile(t, profile)
    t.end()
  })
})

function validateProfile (t, profile) {
  t.pass('starting validation')

  if (!Array.isArray(profile.nodes)) t.fail('profile has a nodes object')
  if (!Array.isArray(profile.scripts)) t.fail('profile has a scripts object')
  if (!Array.isArray(profile.pkgs)) t.fail('profile has a pkgs object')

  const nodes = new Map()
  const scripts = new Map()
  const pkgs = new Map()

  for (let node of profile.nodes) { nodes.set(node.id, node) }
  for (let script of profile.scripts) { scripts.set(script.id, script) }
  for (let pkg of profile.pkgs) { pkgs.set(pkg.path, pkg) }

  let testsRun = 0
  let testsPassed = 0

  for (let node of profile.nodes) {
    if (node.children == null) continue

    for (let child of node.children) {
      testOk(t, nodes.get(child), `child node ${child} found`)
    }

    testOk(t, scripts.get(node.callFrame.scriptId), `script ${node.callFrame.scriptId} found`)
  }

  for (let script of profile.scripts) {
    const pkg = script.pkg
    testOk(t, pkgs.get(pkg), `pkg ${pkg} found`)
  }

  t.equal(testsPassed, testsRun, `all ${testsRun} tests should pass`)

  function testOk (t, value, message) {
    testsRun++
    if (value) {
      testsPassed++
      return
    }

    t.fail(message)
  }
}
