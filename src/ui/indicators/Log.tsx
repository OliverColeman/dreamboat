import { Box, makeStyles } from '@material-ui/core'
import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

const logState = atom<string[]>({
  key: 'LogState',
  default: ['Log started'],
})

const useStyles = makeStyles(() =>
  ({
    root: () => ({
      position: 'absolute',
      bottom: 0,
      left: 200,
      zIndex: 10,
      fontSize: '16px',
      width: 300,
      height: 40,
      overflowX: 'hidden',
      overflowY: 'auto',
    }),
  })
)

const Log = () => {
  const messages = useRecoilValue(logState)

  const classes = useStyles()

  return (
    <div className={classes.root}>
      { messages.map((m, i) =>
        <div key={`log-${i}-${m}`}>{m}</div>
      ) }
    </div>
  )
}

export default Log

export function useLog () {
  const setMessages = useSetRecoilState(logState)

  const log = (msg:string) => setMessages((messages) => [
    ...messages,
    msg,
  ])

  return log
}
