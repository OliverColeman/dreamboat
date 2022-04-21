import * as winston from 'winston'
const { colorize, combine, timestamp, label, printf } = winston.format

const formatter = printf((info: any) => {
  const {
    level,
    message,
  } = info
  const infoTimestamp = info.timestamp
  return `${infoTimestamp} [${level}]: ${message}`
})

const createLogger = (name: string) => {
  const logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    format: combine(colorize(), label({ label: name }), timestamp(), formatter),
    transports: [
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
      }),
    ],
    exceptionHandlers: [new winston.transports.Console()],
  })

  return logger
}

/**
 * Customer logger
 */

const logger = createLogger('dreamlog')
export default logger
