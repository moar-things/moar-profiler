'use strict'

// function that are invokable in the target

exports.getRuntimeEvaluateArgs = getRuntimeEvaluateArgs

const TargetFunctions = {}

registerTargetFunction(readJSON)
registerTargetFunction(findAndReadJSON)

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

function readJSON (fileName) {
  const mainModule = this.process.mainModule
  if (mainModule == null) {
    return {
      error: `no main module, REPL not currently supported`
    }
  }

  const require = mainModule.require

  const fs = require('fs')
  try {
    return {
      contents: fs.readFileSync(fileName, 'utf-8')
    }
  } catch (err) {
    return {
      error: `error reading file: ${err}`
    }
  }
}

function findAndReadJSON (filePath) {
  const mainModule = this.process.mainModule
  if (mainModule == null) {
    return {
      error: `no main module, REPL not currently supported`
    }
  }

  const require = mainModule.require

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
        path: filePath,
        contents: contents
      }
    }

    if (filePath === '/') return null
    filePath = path.dirname(filePath)
  }
}
