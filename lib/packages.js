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

  const packages = profile.pkgs = new Map()

  for (let scriptUrl of scripts.keys()) {
    const script = scripts.get(scriptUrl)
    const packageInfo = getPackageInfo(script.url)
    if (packageInfo == null) continue

    if (packages.get(packageInfo.path) == null) {
      packages.set(packageInfo.path, packageInfo)
    }

    script.pkg = packageInfo.path
  }

  const invocations = [
    { method: 'Runtime.enable' }
  ]

  for (let packagePath of packages.keys()) {
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

      const pkg = packages.get(packagePath)
      if (pkg == null) continue

      pkg.version = packageObject.version
      pkg.description = packageObject.description
      pkg.homepage = packageObject.homepage
      pkg.dependencies = getPackageDependencies(packageObject)
    }

    resolveUnknownPackages()
  })

  function resolveUnknownPackages () {
    Log('resolving unknown packages')
    const unknownPaths = new Set()

    for (let scriptUrl of scripts.keys()) {
      const script = scripts.get(scriptUrl)
      if (script.pkg !== UnknownPackage) continue
      unknownPaths.add(path.dirname(script.url))
    }

    Log('unknown paths:', unknownPaths)

    const invocations = []
    for (let unknownPath of unknownPaths) {
      const args = targetFunctions.getRuntimeEvaluateArgs('findAndReadJSON', [unknownPath])
      invocations.push({
        method: 'Runtime.evaluate',
        args: args,
        unknownPath: unknownPath
      })
    }

    const unknownPathMap = new Map()

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

        packages.set(packagePath, {
          path: packagePath,
          name: packageObject.name,
          version: packageObject.version,
          description: packageObject.description,
          homepage: packageObject.homepage,
          dependencies: getPackageDependencies(packageObject)
        })

        unknownPathMap.set(invocation.unknownPath, packagePath)
      }

      Log('unknownPathMap:', unknownPathMap)
      for (let scriptUrl of scripts.keys()) {
        const script = scripts.get(scriptUrl)
        if (script.pkg !== UnknownPackage) continue
        const scriptPath = path.dirname(script.url)
        if (unknownPathMap.has(scriptPath)) {
          script.pkg = unknownPathMap.get(scriptPath)
        }
      }

      cb(null, profile)
    })
  }
}

function getPackageDependencies (packageObject) {
  return {
    prod: packageObject.dependencies,
    dev: packageObject.devDependencies,
    optional: packageObject.optionalDependencies,
    peer: packageObject.peerDependencies
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
