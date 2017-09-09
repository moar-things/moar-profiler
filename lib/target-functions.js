'use strict'

// function that are invokable in the target

exports.getRuntimeEvaluateArgs = getRuntimeEvaluateArgs

const TargetFunctions = {}

registerTargetFunction(getMeta)
registerTargetFunction(readJSON)
registerTargetFunction(findAndReadJSON)
registerTargetFunction(ensureRunningForSeconds)

// get the args to the Runtime.evaluate() method to invoke a function
function getRuntimeEvaluateArgs (functionName, args) {
  const fn = TargetFunctions[functionName]
  if (fn == null) throw new Error(`target function not found: ${functionName}`)

  // Runtime.evaluate() returns {result: RemoteObject, exceptionDetails }
  return {
    expression: `(${fn.toString()}).apply(null, ${JSON.stringify(args)})`,
    silent: true,
    returnByValue: true,
    contextId: 1
  }
}

function registerTargetFunction (fn) {
  TargetFunctions[fn.name] = fn
}

// target functions below

// get meta information about process, returning {error, meta}
function getMeta () {
  if (typeof process === 'undefined') {
    return { error: 'no process object' }
  }

  let nodeVersion = process.version
  if (nodeVersion) nodeVersion = nodeVersion.replace(/^v/, '')

  const result = {
    date: new Date().toISOString(),
    title: process.title,
    nodeVersion: nodeVersion,
    arch: process.arch,
    platform: process.platform,
    pid: process.pid,
    execPath: process.execPath,
    mainModule: process.mainModule && process.mainModule.filename
  }

  return { meta: result }
}

// read a file as JSON, returning {error, contents}
function readJSON (fileName) {
  const require = getRequire()
  if (require == null) return { error: `can't find require` }

  const fs = require('fs')
  try {
    return {
      contents: fs.readFileSync(fileName, 'utf-8')
    }
  } catch (err) {
    return { error: `error reading file: ${err}` }
  }

  function getRequire () {
    if (this.process && this.process.mainModule) return this.process.mainModule.require
    if (typeof global !== 'undefined') return global.require
  }
}

// find a package.json file (looking up), returning {error, path, contents}
function findAndReadJSON (filePath) {
  const require = getRequire()
  if (require == null) return { error: `can't find require` }

  const fs = require('fs')
  const path = require('path')

  while (true) {
    const fileName = path.join(filePath, 'package.json')
    let contents
    try {
      contents = fs.readFileSync(fileName, 'utf-8')
    } catch (err) {}

    if (contents) {
      return {
        url: filePath,
        contents: contents
      }
    }

    if (filePath === '/' || !filePath) return null

    filePath = path.dirname(filePath)
  }

  function getRequire () {
    if (this.process && this.process.mainModule) return this.process.mainModule.require
    if (typeof global !== 'undefined') return global.require
  }
}

// ensure the Node.js process is running for specified number of seconds
function ensureRunningForSeconds (seconds) {
  const require = getRequire()
  if (require == null) return { error: `can't find require` }

  const timers = require('timers')

  console.log(`ensureRunningForSeconds: setting timeout for ${seconds} seconds`)
  timers.setTimeout(onTimeout, seconds * 1000)

  // don't need to do anything here; the timeout ensures Node.js won't exit
  function onTimeout () {
    console.log(`ensureRunningForSeconds: timeout fired`)
  }

  function getRequire () {
    if (this.process && this.process.mainModule) return this.process.mainModule.require
    if (typeof global !== 'undefined') return global.require
  }
}
