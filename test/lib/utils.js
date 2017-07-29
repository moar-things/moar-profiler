'use strict'

exports.createTestRunner = createTestRunner

const path = require('path')

const tape = require('tape')

// Create a test runner given the source file name of the test.
// Returns a function which takes a test function, which takes a standard `t`
// tape object as a parameter.
function createTestRunner (sourceFile) {
  sourceFile = testFileName(sourceFile)

  return function testRunner (testFunction) {
    const testName = `${sourceFile} - ${testFunction.name}()`

    tape(testName, function (t) { testFunction(t) })
  }
}

function testFileName (sourceFile) {
  const dName = path.basename(path.dirname(sourceFile))
  const bName = path.basename(sourceFile)
  return `${dName}/${bName}`
}
