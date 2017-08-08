'use strict'

exports.addMeta = addMeta

const pkg = require('../package.json')
const inspectorFunctions = require('./inspector-functions')
const targetFunctions = require('./target-functions')

const Log = require('./logger').getLogger(__filename)

function addMeta (session, profile, cb) {
  const invocations = [
    { method: 'Runtime.enable' },
    {
      method: 'Runtime.evaluate',
      args: targetFunctions.getRuntimeEvaluateArgs('getMeta')
    }
  ]

  inspectorFunctions.run(session, invocations, (err, invocations) => {
    if (err) return cb(err) // shouldn't happen

    for (let invocation of invocations) {
      if (invocation.method !== 'Runtime.evaluate') continue

      if (invocation.result.exceptionDetails != null) {
        return Log.andCallbackError(cb, `error getting meta information:`, invocation.result.exceptionDetails)
      }

      const result = getInvocationValue(invocation)
      if (result == null) return cb(null, profile)

      if (result.error != null) {
        return Log.andCallbackError(cb, `error obtaining meta information: ${result.error}`)
      }

      profile.meta = result.meta || {}
      profile.meta.moarVersion = pkg.version
      return cb(null, profile)
    }

    return cb(null, profile)
  })
}

function getInvocationValue (invocation) {
  if (invocation.result == null) {
    Log('expecting a "result" on invocation')
    return null
  }

  if (invocation.result.result == null) {
    Log('expecting a "result.result" on invocation')
    return null
  }

  if (invocation.result.result.value == null) {
    Log('expecting a "result.result.value" on invocation')
    Log('invocation.result:', invocation.result)
    return null
  }

  return invocation.result.result.value
}
