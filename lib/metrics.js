'use strict'

// TODO: will need to inject this into the profiled process

exports.metricsStart = metricsStart

function metricsStart () {
  const cpuUsageStart = process.cpuUsage()
  const memUsageStart = process.memoryUsage()
  const timeStart = Date.now()

  return function metricsStop () {
    const time = Date.now() - timeStart
    const cpuUsage = process.cpuUsage(cpuUsageStart)
    const memUsageStop = process.memoryUsage()

    cpuUsage.user = Math.round(100 * (cpuUsage.user / 1000) / time)
    cpuUsage.system = Math.round(100 * (cpuUsage.system / 1000) / time)
    const result = {
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        total: cpuUsage.user + cpuUsage.system
      },
      mem: {
        rss: memUsageStop.rss - memUsageStart.rss,
        heapUsed: memUsageStop.heapUsed - memUsageStart.heapUsed,
        heapTotal: memUsageStop.heapTotal - memUsageStart.heapTotal
      }
    }

    if (memUsageStop.external) {
      result.mem.external = memUsageStop.external - memUsageStart.external
    }

    return result
  }
}
