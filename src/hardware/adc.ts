// Require rpio like this because https://stackoverflow.com/a/43971252/1133481

let rpio

try {
  rpio = window.require('rpio')

  rpio.init({
    gpiomem: false, // Use /dev/mem to allow SPI, i2c etc
  })

  // Init SPI for access to mcp3008
  rpio.spiBegin()
  const spiClockMHz = 1.35 // Safe speed for supply voltages down to 2.7V
  rpio.spiSetClockDivider(Math.round(125 / spiClockMHz) * 2) // 250MHz base. Must be even number.
} catch (e) {
  console.warn('Could not load rpio, using dummy ADC implementation.', e)
}

export type ADCConfig = {
  /** Chip select for SPI devices. */
  chipSelect: number
  /** Sample frequency in Hertz. */
  sampleFrequency: number
  /** Denoise exponential moving average factor. Larger value means less de-noising. */
  denoiseAlpha: number
}

export type ADC = {
  openChannel: (channel: number) => void
  closeChannel: (channel: number) => void
  readChannel: (channel: number) => number
  resolution: () => number
}

export const ADCDefaultConfig: ADCConfig = Object.freeze({
  chipSelect: 0,
  sampleFrequency: 100,
  denoiseAlpha: 0.2,
})

function MCP3008ADC (config: ADCConfig) {
  const { chipSelect, sampleFrequency, denoiseAlpha } = config
  const oneMinusDenoiseAlpha = 1 - denoiseAlpha
  const channelValue = new Map<number, number>()

  const readChannel = (channel:number) => {
    const txbuf = Buffer.from([0x01, 0x80 + (channel << 4), 0x00])
    const rxbuf = Buffer.alloc(txbuf.length)
    rpio.spiTransfer(txbuf, rxbuf, txbuf.length)
    const rawValue = ((rxbuf[1] & 0x03) << 8) + rxbuf[2]
    return rawValue
  }

  setInterval(() => {
    rpio.spiChipSelect(chipSelect)

    for (const channel of channelValue.keys()) {
      const currentValue = readChannel(channel)
      const denoisedValue = channelValue.get(channel) * oneMinusDenoiseAlpha + currentValue * denoiseAlpha
      channelValue.set(channel, denoisedValue)
    }
  }, 1000 / sampleFrequency)

  const checkChannelValid = (channel: number) => {
    if (channel < 0 || channel > 7) throw Error(`Channel ${channel} not valid, must be in range [0, 7].`)
  }

  const api: ADC = {
    openChannel: (channel) => {
      checkChannelValid(channel)
      if (!channelValue.has(channel)) {
        channelValue.set(channel, 511)
      }
    },
    closeChannel: (channel) => {
      checkChannelValid(channel)
      if (channelValue.has(channel)) {
        channelValue.delete(channel)
      }
    },
    readChannel: (channel) => {
      if (!channelValue.has(channel)) throw Error(`Channel ${channel} not open.`)
      return channelValue.get(channel)
    },
    resolution: () => 1023,
  }

  return api
}

const adcSingletons = new Map<number, ADC>()

export function getADC (config: Partial<ADCConfig> = {}) {
  const fullConfig = {
    ...ADCDefaultConfig,
    ...config,
  }
  if (!adcSingletons.has(fullConfig.chipSelect)) {
    adcSingletons.set(fullConfig.chipSelect, MCP3008ADC(fullConfig))
  }
  return adcSingletons.get(fullConfig.chipSelect)
}
