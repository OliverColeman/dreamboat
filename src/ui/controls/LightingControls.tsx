import React, { useCallback } from 'react'
import { useRecoilState } from 'recoil'
import { Button, makeStyles } from '@material-ui/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'

import { lightingState } from '../../model/state'
import { fontSize, lightingLevelCount } from '../../settings'
import { LightingPattern, lightingPatternLabels } from '../../model/types'
import { constrainRange } from '../../util'

/** Side of the square step and pattern buttons, in pixels. Large enough to hit by hand on the
 * hand-held controller's screen, which is worked at arm's length rather than with a mouse. */
const buttonSize = 56
/** Space between the white, RGB and pattern controls, in pixels. Wide enough that the three read as
 * separate controls and that a thumb aimed at one cannot catch the edge of its neighbour. */
const groupSpacing = 48
/** Width of the box holding a level digit, in pixels. Fixed, and wide enough for the widest digit at
 * the label font size, so that nothing in the row moves as the values change. */
const readoutWidth = 28

/** The pattern identifiers in the order they are cycled through, which is also the order the firmware
 * indexes them in. */
const patternIdentifiers = Object.keys(LightingPattern) as LightingPattern[]

/** The display form of a pattern: its position in the cycle as a letter, starting at A. Derived from
 * the index rather than written out per pattern, so it holds for as many patterns as there are
 * letters. */
const patternLetter = (pattern:LightingPattern) =>
  String.fromCharCode(65 + patternIdentifiers.indexOf(pattern))

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    marginRight: groupSpacing,
    '&:last-child': {
      marginRight: 0,
    },
  },
  label: {
    fontSize,
    marginRight: 8,
  },
  // The buttons carry a border but no fill, so the visualisation behind the row shows through. The
  // hover fill is cleared with them: the controller has a touch screen, where hover has no meaning.
  stepButton: {
    minWidth: buttonSize,
    width: buttonSize,
    height: buttonSize,
    fontSize,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  readout: {
    display: 'block',
    width: readoutWidth,
    fontSize,
    lineHeight: 1,
    textAlign: 'center',
  },
  patternButton: {
    minWidth: buttonSize,
    width: buttonSize,
    height: buttonSize,
    padding: 0,
    fontSize,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
}))

type LevelControlProps = {
  /** Display form of the channel name, shown beside its readout. */
  label: string
  /** Full name of the channel, used for the accessible names of its two buttons, which a single
   * letter does not describe. */
  name: string
  /** Current level of the channel, in range [0, lightingLevelCount - 1]. */
  level: number
  /** Called with -1 or 1 to step the level down or up. */
  step: (delta:number) => void
}

/** A channel name, a button to step its level down, the level as a digit, and a button to step it up. */
function LevelControl ({ label, name, level, step }:LevelControlProps) {
  const classes = useStyles()

  return (
    <div className={classes.group}>
      <div className={classes.label}>{label}</div>
      <Button
        className={classes.stepButton}
        variant="outlined"
        aria-label={`${name} level down`}
        disabled={level === 0}
        onClick={() => step(-1)}
      >
        <FontAwesomeIcon icon={faMinus} />
      </Button>
      <div className={classes.readout}>{level}</div>
      <Button
        className={classes.stepButton}
        variant="outlined"
        aria-label={`${name} level up`}
        disabled={level === lightingLevelCount - 1}
        onClick={() => step(1)}
      >
        <FontAwesomeIcon icon={faPlus} />
      </Button>
    </div>
  )
}

/** Controls for the light-emitting diode (LED) strip: the level of the white channel, the level of the
 * red, green and blue (RGB) channels, and which RGB pattern is showing. The levels are indices into the
 * perceptual intensity scale, and the digit the operator steps through is that index; the conversion to
 * an 8-bit intensity happens in the firmware.
 */
export default function LightingControls () {
  const classes = useStyles()
  const [lighting, setLighting] = useRecoilState(lightingState)

  const stepWhiteLevel = useCallback((delta:number) =>
    setLighting(current => ({
      ...current,
      whiteLevel: constrainRange(current.whiteLevel + delta, 0, lightingLevelCount - 1),
    })), [setLighting])

  const stepRgbLevel = useCallback((delta:number) =>
    setLighting(current => ({
      ...current,
      rgbLevel: constrainRange(current.rgbLevel + delta, 0, lightingLevelCount - 1),
    })), [setLighting])

  const cyclePattern = useCallback(() =>
    setLighting(current => ({
      ...current,
      pattern: patternIdentifiers[
        (patternIdentifiers.indexOf(current.pattern) + 1) % patternIdentifiers.length
      ],
    })), [setLighting])

  return (
    <div className={classes.root}>
      <LevelControl label="W" name="White" level={lighting.whiteLevel} step={stepWhiteLevel} />
      <LevelControl label="RGB" name="RGB" level={lighting.rgbLevel} step={stepRgbLevel} />
      <div className={classes.group}>
        <div className={classes.label}>P</div>
        <Button
          className={classes.patternButton}
          variant="outlined"
          aria-label={`RGB pattern, ${lightingPatternLabels[lighting.pattern]}`}
          onClick={cyclePattern}
        >
          <span className={classes.readout}>{patternLetter(lighting.pattern)}</span>
        </Button>
      </div>
    </div>
  )
}
