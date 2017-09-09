moar-profiler - v8 cpu profiler with moar
================================================================================

`moar-profiler` is a command line program which can generate a CPU profile
for a Node.js program running with the `--inspect` option.

The CPU profile data is produced from the [V8 Profiler][] which collects
timing samples of your functions and the stack frames they are executing in,
while your program is running.  The data can then be visualized in profiling
tools, like [Chrome Dev Tools][].

`moar-profiler` starts with that then, *enriches* that data with even **moar**!

* JavaScript source of the modules that appear in the profile
* package information on those modules
* some metadata about your node process

You can use the online [moar-profile-viewer][] to display that enriched profile
data.  Or just use any old profile viewer like [Chrome Dev Tools][], and it
will just ignore the additional information.

[moar-profile-viewer]: https://moar-things.github.io/moar-profile-viewer/
[V8 Profiler]: https://chromedevtools.github.io/devtools-protocol/v8/Profiler/
[Chrome Dev Tools]: doc/node-CDT.md

usage
================================================================================

    moar-profiler [options] inspector-url

The `inspector-url` parameter should be an http/s: url to a Node.js process
running with the inspector port open.  When invoking node with the `--inspect`
option, it will use the port 9229, so the url would be `http://localhost:9229`.
When the url protocol / hostname is `http://localhost`, you can just provide the
port number instead of the complete url.  So instead of `http://localhost:9229`
you can use `9229` as the url.

The generated profile will be written to stdout.  Some tools require the
file extension of the profile to be `.cpuprofile`, but the data in the file
is delicious, creamy JSON.

### options

| option          | description |
|-----------------|------------------------------------------------------|
| `-d --duration` | how long to profile the process (default: 5 seconds) |
| `-s --sampling` | sample rate (default: 1000 microseconds) |
| `-h --help`     | print this help |
| `-v --version`  | print the program version |

Debug logging is enabled by setting the environment variable `LOGLEVEL` to
`debug`.

Example usage:

    # start your application
    node --inspect my

    # run the profiler in another terminal
    moar-profiler -d 3 9229 > my.moar.cpuprofile


install
================================================================================

    npm install -g moar-things/moar-profiler


license
================================================================================

This package is licensed under the MIT license.  See the
[LICENSE.md](LICENSE.md) file for more information.


contributing
================================================================================

Awesome!  We're happy that you want to contribute.

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.
