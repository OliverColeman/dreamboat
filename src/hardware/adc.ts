// Require rpio like this because https://stackoverflow.com/a/43971252/1133481

let rpio

/** Whether rpio loaded and its serial peripheral interface (SPI) came up. This is only so on the
 * Raspberry Pi in the hand-held controller, which is where the MCP3008 analogue-to-digital
 * converter (ADC) is wired; anywhere else `DummyADC` stands in for it.
 */
let rpioAvailable = false

try {
  rpio = window.require('rpio')

  rpio.init({
    gpiomem: false, // Use /dev/mem to allow SPI, i2c etc
  })

  // Init SPI for access to mcp3008
  rpio.spiBegin()
  const spiClockMHz = 1.35 // Safe speed for supply voltages down to 2.7V
  rpio.spiSetClockDivider(Math.round(125 / spiClockMHz) * 2) // 250MHz base. Must be even number.

  rpioAvailable = true
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

/** Largest value the ten-bit MCP3008 reports. */
const adcResolution = 1023
/** The middle of the ADC range, which is what a joystick axis reads when it is centred. */
const adcMidScale = Math.round(adcResolution / 2)

/** The MCP3008 has eight channels. */
const checkChannelValid = (channel: number) => {
  if (channel < 0 || channel > 7) throw Error(`Channel ${channel} not valid, must be in range [0, 7].`)
}

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

  const api: ADC = {
    openChannel: (channel) => {
      checkChannelValid(channel)
      if (!channelValue.has(channel)) {
        channelValue.set(channel, adcMidScale)
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
    resolution: () => adcResolution,
  }

  return api
}

/** Stands in for the MCP3008 where rpio is unavailable, which is every machine other than the
 * Raspberry Pi in the hand-held controller. Every open channel reads as centred, so the joysticks
 * sit at rest and the vehicle stays still until another control moves it.
 */
function DummyADC () {
  const openChannels = new Set<number>()

  const api: ADC = {
    openChannel: (channel) => {
      checkChannelValid(channel)
      openChannels.add(channel)
    },
    closeChannel: (channel) => {
      checkChannelValid(channel)
      openChannels.delete(channel)
    },
    readChannel: (channel) => {
      if (!openChannels.has(channel)) throw Error(`Channel ${channel} not open.`)
      return adcMidScale
    },
    resolution: () => adcResolution,
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
    adcSingletons.set(fullConfig.chipSelect, rpioAvailable ? MCP3008ADC(fullConfig) : DummyADC())
  }
  return adcSingletons.get(fullConfig.chipSelect)
}
