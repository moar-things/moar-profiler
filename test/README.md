running tests
===============================================================================

The tests are run via `npm test` by running `run-tests.sh`, which arranges
to run a node process that is profiled from "the command-line" instead of
in-process.  It then also generates an in-process profile, as long as you're
running node >= 8.
