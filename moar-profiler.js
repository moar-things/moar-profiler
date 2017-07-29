#!/usr/bin/env node

'use strict'

const inspectorRemote = require('inspector-remote')

const pkg = require('./package.json')
const profiler = require('./lib/profiler')
const sources = require('./lib/sources')
const packages = require('./lib/packages')

const Log = require('./lib/logger').getLogger(__filename)

const DefaultOpts = {
  duration: 5,    // seconds
  sampling: 1000  // microseconds
}

exports.version = pkg.version
exports.supportsLocal = inspectorRemote.supportsLocal
exports.profile = profile
exports.defaultOpts = DefaultOpts

function profile (url, opts, cb) {
  if (url == null && !exports.supportsLocal) {
    return cb(new Error('in-process profiling is not supported in this version of Node.js'))
  }

  if (cb == null && typeof opts === 'function') {
    cb = opts
    opts = null
  }

  if (opts == null) opts = {}
  opts = Object.assign({}, DefaultOpts, opts)

  if (cb == null) cb = function () {}

  const locale = url == null ? 'in-process' : `at ${url}`
  Log(`starting moar-profile ${locale} with options ${JSON.stringify(opts)}`)

  Log('creating session')
  const session = inspectorRemote.createSession(url)
  if (session == null) {
    return Log.andCallbackError(cb, 'error creating session')
  }

  Log('running basic profile')
  profiler.profile(session, opts, profileDone)

  function profileDone (err, profile) {
    if (err) return Log.andCallbackError(cb, err, 'error running profile')

    Log('adding sources')
    sources.addSources(session, profile, sourcesAdded)
  }

  function sourcesAdded (err, profile) {
    if (err) return Log.andCallbackError(cb, err, 'error adding sources')

    Log('adding packages from profile')
    packages.addPackages(session, profile, packagesAdded)
  }

  function packagesAdded (err, profile) {
    if (err) return Log.andCallbackError(cb, err, 'error adding packages')

    Log('disconnecting session')
    session.disconnect()
    cb(null, profile)
  }
}

if (require.main === module) require('./lib/cli').run()
