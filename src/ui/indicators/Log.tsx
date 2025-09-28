import { makeStyles } from '@material-ui/core'
import { atom, useRecoilValue, useSetRecoilState } from 'recoil'

export const logState = atom<string[]>({
  key: 'LogState',
  default: ['Log started'],
})

export function useLog () {
  const setMessages = useSetRecoilState(logState)

  const log = (msg:string) => setMessages((messages) => [
    msg,
    ...messages.slice(0, 9),
  ])

  return log
}

const useStyles = makeStyles(() =>
  ({
    root: () => ({
      position: 'absolute',
      bottom: 0,
      left: 200,
      zIndex: 10,
      fontSize: '16px',
      width: 500,
      height: 70,
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
