'use strict'

exports.run = run

const async = require('async')

const Log = require('./logger').getLogger(__filename)

// invoke multiple inspector methods in a series, returning results in same
// invocations array element

// invocations: [ { method, args, before, after } ]
// on success, cb adds the following to the invocation elements [ { err, result } ]

// method is the inspector method
// args   are the arguments to the inspector method
// before is a function called before the invocation, with the invocation object
// after  is a function called after  the invocation, with the invocation object
function run (session, invocations, cb) {
  async.mapSeries(invocations, _invokeOneMethod, (err, results) => {
    if (err) return cb(err) // shouldn't happen, but just in case
    cb(null, results)
  })

  function _invokeOneMethod (invocation, acb) {
    if (invocation.before != null) invocation.before(invocation)
    Log(`invoking ${invocation.method}`)
    session.post(invocation.method, invocation.args, (err, result) => {
      invocation.err = err
      invocation.result = result
      if (invocation.after != null) invocation.after(invocation)
      acb(null, invocation)
    })
  }
}
