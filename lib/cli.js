#!/usr/bin/env node

'use strict'

exports.run = run

const fs = require('fs')
const path = require('path')

const minimist = require('minimist')

const pkg = require('../package.json')
const moarProfiler = require('../moar-profiler')

// generate a moar-profile
function run () {
  const minimistOpts = {
    string: ['timeStart', 'timeEnd', 'region'],
    boolean: ['help', 'version'],
    alias: {
      d: 'duration',
      s: 'sampling',
      h: 'help',
      v: 'version'
    }
  }

  const argv = minimist(process.argv.slice(2), minimistOpts)

  // check for help and version options
  if (argv.version) version()
  if (argv.help) help()
  if (argv._.length === 0) help()

  if (argv.duration == null) argv.duration = moarProfiler.defaultOpts.duration
  if (argv.sampling == null) argv.sampling = moarProfiler.defaultOpts.sampling

  const url = argv._[0]
  const opts = {
    duration: argv.duration || moarProfiler.defaultOpts.duration,
    sampling: argv.sampling || moarProfiler.defaultOpts.sampling
  }

  if (typeof opts.duration !== 'number') {
    log(`the duration object should be a number, but was ${opts.duration}`)
    process.exit(1)
  }

  if (typeof opts.sampling !== 'number') {
    log(`the sampling object should be a number, but was ${opts.sampling}`)
    process.exit(1)
  }

  log(`starting profile of ${url} for ${opts.duration} seconds, sampling at ${opts.sampling}us`)
  moarProfiler.profile(url, opts, (err, profile) => {
    if (err) {
      log(`error generating profile:`, err)
      process.exit(1)
    }
    console.log(JSON.stringify(profile))
    log(`generated profile`)
  })
}

function log (message, err) {
  console.error(`${pkg.name}: ${message}`)
  if (err != null) console.error(err)
}

// print version and exit
function version () {
  console.log(pkg.version)
  process.exit(0)
}

// print help and exit
function help () {
  console.log(getHelp())
  process.exit(1)
}

// get help text
function getHelp () {
  const helpFile = path.join(__dirname, 'HELP.md')
  let helpText = fs.readFileSync(helpFile, 'utf8')

  helpText = helpText.replace(/%%program%%/g, pkg.name)
  helpText = helpText.replace(/%%version%%/g, pkg.version)
  helpText = helpText.replace(/%%description%%/g, pkg.description)
  helpText = helpText.replace(/%%homepage%%/g, pkg.homepage)

  return helpText
}

// run cli if invoked as main module
if (require.main === module) run()
