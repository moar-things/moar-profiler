'use strict'

exports.addSources = addSources

const inspectorFunctions = require('./inspector-functions')

const Log = require('./logger').getLogger(__filename)

function addSources (session, profile, cb) {
  Log('adding scripts to profile')

  const nodes = profile.nodes
  if (!Array.isArray(nodes)) {
    const err = new Error('profile.nodes is not an array')
    return setImmediate(Log.andCallbackError, cb, err)
  }

  if (profile.scripts != null) {
    Log('profile.scripts already exists')
    return setImmediate(cb, null, profile)
  }

  profile.scripts = {}
  for (let node of nodes) {
    const callFrame = node.callFrame
    if (callFrame == null) continue

    const scriptId = callFrame.scriptId
    if (scriptId == null) continue

    if (profile.scripts[scriptId] != null) continue

    profile.scripts[scriptId] = {
      id: scriptId,
      url: callFrame.url
    }
  }

  const invocations = [
    { method: 'Debugger.enable' }
  ]

  for (let scriptId in profile.scripts) {
    invocations.push({
      method: 'Debugger.getScriptSource',
      args: { scriptId: scriptId }
    })
  }

  inspectorFunctions.run(session, invocations, (err, invocations) => {
    if (err) return cb(err) // shouldn't happen
    for (let invocation of invocations) {
      if (invocation.method !== 'Debugger.getScriptSource') continue

      const scriptId = invocation.args.scriptId
      if (invocation.err) invocation.result = { scriptSource: '' }

      if (invocation.result == null) continue
      profile.scripts[scriptId].source = invocation.result.scriptSource
    }

    cb(null, profile)
  })
}
