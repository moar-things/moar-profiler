'use strict'

exports.profile = profile

const inspectorFunctions = require('./inspector-functions')

const Log = require('./logger').getLogger(__filename)

function profile (session, opts, cb) {
  Log('connecting session')
  session.connect(sessionConnected)

  function sessionConnected (err) {
    if (err) return Log.andCallbackError(cb, err, 'error connecting session')

    session.on('Debugger.paused', () => {
      Log('debugger paused, so resuming')
      session.post('Debugger.resume', (err) => {
        if (err) Log('error resuming debugg:', err)
      })
    })

    const invocations = [
      { method: 'Runtime.runIfWaitingForDebugger' },
      { method: 'Runtime.enable' },
      // { method: 'Debugger.enable' },
      { method: 'Profiler.enable' },
      { method: 'Profiler.setSamplingInterval', args: { interval: opts.sampling } },
      // { method: 'Debugger.resume' },
      { method: 'Profiler.start' }
    ]

    invocations.forEach(invocation => {
      invocation.before = invocationBefore
      invocation.after = invocationAfter
    })

    inspectorFunctions.run(session, invocations, (err, invocations) => {
      if (err) return cb(err) // shouldn't happen
      for (let invocation of invocations) {
        if (invocation.err) return cb(err)
      }

      setTimeout(stopProfiler, opts.duration * 1000)
    })
  }

  function stopProfiler () {
    Log('stopping profile')
    session.post('Profiler.stop', profilerStopped)
  }

  function profilerStopped (err, profile) {
    if (err) return Log.andCallbackError(cb, err, 'error stopping profile')

    Log('stopped profile')
    cb(null, profile.profile)
  }
}

function invocationBefore (invocation) {
  Log(`inspector method ${invocation.method} called with:`, invocation.args)
}

function invocationAfter (invocation) {
  const err = invocation.err
  if (err) return Log(`inspector method ${invocation.method} returned with error:`, err)
  Log(`inspector method ${invocation.method} returned with:`, invocation.result)
}
