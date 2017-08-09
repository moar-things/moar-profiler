'use strict'

exports.addPackages = addPackages

const path = require('path')

const inspectorFunctions = require('./inspector-functions')
const targetFunctions = require('./target-functions')

const SystemPackage = '(system)'
const UnknownPackage = '(unknown)'

const Log = require('./logger').getLogger(__filename)

function addPackages (session, profile, cb) {
  const scripts = profile.scripts
  if (typeof scripts !== 'object') {
    return setImmediate(Log.andCallbackError, cb, 'profile.scripts is not an object')
  }

  if (profile.pkgs != null) {
    Log('profile.pkgs already exists')
    return setImmediate(cb)
  }

  const packages = profile.pkgs = {}

  for (let scriptUrl in scripts) {
    const script = scripts[scriptUrl]
    const packageInfo = getPackageInfo(script.url)
    if (packageInfo == null) continue

    if (packages[packageInfo.path] == null) {
      packages[packageInfo.path] = packageInfo
    }

    script.pkg = packageInfo.path
  }

  const invocations = [
    { method: 'Runtime.enable' }
  ]

  for (let packagePath in packages) {
    if (packagePath === SystemPackage) continue
    if (packagePath === UnknownPackage) continue

    const packageFile = path.join(packagePath, 'package.json')
    const args = targetFunctions.getRuntimeEvaluateArgs('readJSON', [packageFile])
    invocations.push({
      method: 'Runtime.evaluate',
      args: args,
      packagePath: packagePath
    })
  }

  inspectorFunctions.run(session, invocations, (err, invocations) => {
    if (err) return cb(err) // shouldn't happen

    for (let invocation of invocations) {
      if (invocation.method !== 'Runtime.evaluate') continue

      const packagePath = invocation.packagePath
      if (invocation.result.exceptionDetails != null) {
        Log(`error getting package.json for ${packagePath}:`, invocation.result.exceptionDetails)
        continue
      }

      const result = getInvocationValue(invocation)
      if (result == null) continue

      if (result.error != null) {
        Log(`error reading package.json: ${result.error}`)
        continue
      }

      let packageObject
      try {
        packageObject = JSON.parse(result.contents)
      } catch (err) {
        Log(`error parsing package.json: ${err}`)
        continue
      }

      packages[packagePath].version = packageObject.version
      packages[packagePath].description = packageObject.description
      packages[packagePath].homepage = packageObject.homepage
      packages[packagePath].dependencies = packageObject.dependencies
      packages[packagePath].devDependencies = packageObject.devDependencies
      packages[packagePath].peerDependencies = packageObject.peerDependencies
      packages[packagePath].optionalDependencies = packageObject.optionalDependencies
    }

    resolveUnknownPackages()
  })

  function resolveUnknownPackages () {
    Log('resolving unknown packages')
    const unknownPaths = {}

    for (let scriptUrl in scripts) {
      const script = scripts[scriptUrl]
      if (script.pkg !== UnknownPackage) continue
      unknownPaths[path.dirname(script.url)] = true
    }

    Log('unknown paths:', unknownPaths)

    const invocations = []
    for (let unknownPath in unknownPaths) {
      const args = targetFunctions.getRuntimeEvaluateArgs('findAndReadJSON', [unknownPath])
      invocations.push({
        method: 'Runtime.evaluate',
        args: args,
        unknownPath: unknownPath
      })
    }

    const unknownPathMap = {}

    inspectorFunctions.run(session, invocations, (err, invocations) => {
      if (err) return cb(err) // shouldn't happen

      for (let invocation of invocations) {
        const result = getInvocationValue(invocation)
        if (result == null) continue

        if (result.error != null) {
          Log(`error reading package.json: ${result.error}`)
          continue
        }

        const packagePath = result.path
        if (packagePath == null) {
          Log(`no path found for package`)
          continue
        }

        Log('found unknown package at:', packagePath)

        let packageObject
        try {
          packageObject = JSON.parse(result.contents)
        } catch (err) {
          Log(`error parsing package.json: ${err}`)
          continue
        }

        packages[packagePath] = {
          path: packagePath,
          name: packageObject.name,
          version: packageObject.version,
          description: packageObject.description,
          homepage: packageObject.homepage
        }

        unknownPathMap[invocation.unknownPath] = packagePath
      }

      Log('unknownPathMap:', unknownPathMap)
      for (let scriptUrl in scripts) {
        const script = scripts[scriptUrl]
        if (script.pkg !== UnknownPackage) continue
        const scriptPath = path.dirname(script.url)
        if (unknownPathMap[scriptPath] != null) {
          script.pkg = unknownPathMap[scriptPath]
        }
      }

      cb(null, profile)
    })
  }
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

// return {path: 'dir-of-package.json', name: 'package-name'}
function getPackageInfo (url) {
  if (url == null || url === '') return { path: SystemPackage, name: SystemPackage }
  if (url[0] !== '/') return { path: SystemPackage, name: SystemPackage }

  const match = url.match(/(.*)\/node_modules\/(.*)/i)
  if (match == null) {
    return {path: UnknownPackage, name: UnknownPackage}
  }

  const pathStart = match[1]
  const pathEnd = match[2]
  const pathEndParts = pathEnd.split('/')

  let packageName
  if (pathEnd[0] === '@') {
    packageName = pathEndParts.slice(0, 2).join('/')
  } else {
    packageName = pathEndParts[0]
  }

  const packagePath = path.join(pathStart, 'node_modules', packageName)

  return {
    path: packagePath,
    name: packageName
  }
}
