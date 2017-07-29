'use strict'

const moarProfiler = require('..')

const url = process.argv[2]
const inProcess = url == null

if (inProcess) {
  console.error('moar-profiling in-process')
} else {
  console.error(`moar-profiling process at inspector port ${url}`)
}

const opts = {
  duration: 3,   // seconds
  sampling: 1000 // microseconds
}

moarProfiler.profile(url, opts, (err, profile) => {
  if (err) return console.error('error:', err)

  console.error('profiling complete; writing profile to stdout')

  console.log(JSON.stringify(profile, null, 4))
})

console.error(`
You can redirect the output of this program to a file with an extension of
.cpuprofile, and then load the profile in Chrome's dedicated DevTools for
node, like so:

- in Chrome, go to url chrome://inspect/
- on that page, click the link "Open dedicated DevTools for Node"
- click on the link to the Profiler tab at the top of the window
- click the "Load" button
- select your file with the .cpuprofile extension
- enjoy!
- for more help with using the Profiler tool, see:
  https://developers.google.com/web/tools/chrome-devtools/rendering-tools/js-execution
`)
