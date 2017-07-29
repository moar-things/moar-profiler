%%program%% %%version%% - %%description%%

usage:

    %%program%% [options] inspector-url

The inspector-url should be an http/s: url to a Node.js process running
with the inspector port open.  When invoking node with the `--inspect` option,
it will use the port 9229, so the url would be `http://localhost:9229`.

The generated profile will be written to stdout.  Some tools require the
file extension of the profile to be `.cpuprofile`, but the data in the file
is delicious, creamy JSON.

options:

    -d --duration     how long to profile the process (default: 5 seconds)
    -s --sampling     sample rate (default: 1000 microseconds)
    -h --help         print this help
    -v --version      print the program version

Debug logging is enabled by setting the environment variable `LOGLEVEL` to
`debug`.

For more information, visit %%homepage%%
