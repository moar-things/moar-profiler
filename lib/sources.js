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

  profile.scripts = new Map()
  for (let node of nodes) {
    const callFrame = node.callFrame
    if (callFrame == null) continue

    const scriptId = callFrame.scriptId
    if (scriptId == null) continue

    if (profile.scripts.get(scriptId) != null) continue

    profile.scripts.set(scriptId, {
      id: scriptId,
      url: callFrame.url
    })
  }

  const invocations = [
    { method: 'Debugger.enable' }
  ]

  for (let scriptId of profile.scripts.keys()) {
    Log(`getting source for ${scriptId}`)
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
      if (invocation.err) {
        Log(`error getting source for ${scriptId}: ${invocation.err}`)
      }

      if (invocation.result == null) {
        Log(`error getting source for ${scriptId}: result was null`)
        continue
      }

      const script = profile.scripts.get(scriptId)
      if (script == null) {
        Log(`error getting source for ${scriptId}: can't find script`)
        continue
      }

      script.source = invocation.result.scriptSource
    }

    cb(null, profile)
  })
}
