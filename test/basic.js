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

    validateProfile(t, profile)
    t.end()

    profile.timeDeltas = []
    profile.samples = []
  })
})

runTest(function runTestInProcess (t) {
  moarProfiler.profile(null, { duration: 1 }, (err, profile) => {
    if (err) {
      t.error(err, `error running profile: ${err}`)
      t.end()
      return
    }

    validateProfile(t, profile)
    t.end()
  })

  keepBusy(1)
})

function validateProfile (t, profile) {
  t.ok(Array.isArray(profile.nodes), 'profile has a nodes object')
  t.ok(Array.isArray(profile.scripts), 'profile has a scripts object')
  t.ok(Array.isArray(profile.pkgs), 'profile has a pkgs object')

  const nodes = new Map()
  const scripts = new Map()
  const pkgs = new Map()

  for (let node of profile.nodes) { nodes.set(node.id, node) }
  for (let script of profile.scripts) { scripts.set(script.id, script) }
  for (let pkg of profile.pkgs) { pkgs.set(pkg.path, pkg) }

  for (let node of profile.nodes) {
    if (node.children == null) continue
    for (let child of node.children) {
      t.ok(nodes.get(child), `child node ${child} found`)
    }
    t.ok(scripts.get(node.callFrame.scriptId), `script ${node.callFrame.scriptId} found`)
  }

  for (let script of profile.scripts) {
    const pkg = script.pkg
    t.ok(pkgs.get(pkg), `pkg ${pkg} found`)
  }
}

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
