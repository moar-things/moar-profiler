'use strict'

exports.getLogger = getLogger

const util = require('util')
const path = require('path')

const pkg = require('../package.json')

const ProjectPath = path.dirname(__dirname)

// if env var LOGLEVEL != 'debug', no-op the logger
if (process.env.LOGLEVEL !== 'debug') exports.getLogger = getLoggerNoop

function getLogger (fileName) {
  fileName = path.relative(ProjectPath, fileName)

  logger.andCallbackError = andCallbackError

  return logger

  function logger (args) {
    const message = util.format.apply(util, [].slice.call(arguments))
    console.error(`${pkg.name}: ${fileName}: ${message}`)
  }

  // log and then call the callback with an error
  function andCallbackError (cb, err, message) {
    if (typeof err === 'string') err = new Error(err)

    if (message == null) {
      logger(err)
    } else {
      logger(`${message}:`, err)
    }

    return cb(err)
  }
}

function getLoggerNoop (fileName) {
  logger.andCallbackError = andCallbackError

  return logger

  function logger () {}

  // log and then call the callback with an error
  function andCallbackError (cb, err, message) {
    return cb(err)
  }
}
