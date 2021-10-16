// Require rpio like this because https://stackoverflow.com/questions/43966353/electron-angular-fs-existssync-is-not-a-function
const rpio = window.require('rpio')

rpio.init({
  gpiomem: false, // Use /dev/mem to allow SPI, i2c etc
})

// Init SPI for access to mcp3008
rpio.spiBegin()
rpio.spiChipSelect(0)
const spiClockMHz = 1.35
rpio.spiSetClockDivider(Math.round(125 / spiClockMHz) * 2) // 250MHz base. Must be even number.

export type MCP3008Config = {
  /** The channels to sample */
  channels: number[]
  /** Sample frequency in Hertz. */
  sampleFrequency: number
  /** Denoise exponential moving average factor. */
  denoiseAlpha: number
}

export const MCP3008DefaultConfig = Object.freeze({
  channels: [0, 1, 2, 3, 4, 5, 6, 7],
  sampleFrequency: 100,
  denoiseAlpha: 0.2,
})

export function mcp3008Monitor (config: Partial<MCP3008Config>) {
  const { channels, sampleFrequency, denoiseAlpha } = {
    ...MCP3008DefaultConfig,
    ...config,
  }

  const values = new Map(channels.map(c => [c, 0.5]))
  const oneMinusDenoiseAlpha = 1 - denoiseAlpha

  setInterval(() => {
    for (const channel of channels) {
      const txbuf = Buffer.from([0x01, 0x80 + (channel << 4), 0x00])
      const rxbuf = Buffer.alloc(txbuf.length)
      rpio.spiTransfer(txbuf, rxbuf, txbuf.length)
      const rawValue = ((rxbuf[1] & 0x03) << 8) + rxbuf[2]
      values.set(channel, values.get(channel) * oneMinusDenoiseAlpha + (rawValue / 1023) * denoiseAlpha)
    }
  }, 1000 / sampleFrequency)

  const getMCP3008Value = (channel: number) => values.get(channel)
  return getMCP3008Value
}
