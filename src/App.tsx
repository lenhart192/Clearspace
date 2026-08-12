import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  CircleStop,
  Clock3,
  Flame,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TimerReset,
  Wallet,
  X,
} from 'lucide-react'
import { encodeFunctionData } from 'viem'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { base } from 'wagmi/chains'
import { CLEARSPACE_ADDRESS, clearspaceAbi, isContractConfigured } from './config/contract'
import { DATA_SUFFIX } from './config/wagmi'

const DURATIONS = [1, 15, 25, 50]
type TimerState = 'idle' | 'running' | 'paused' | 'complete'
type Action = 'session' | 'checkin' | null

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect'
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const { sendTransactionAsync, data: hash, isPending: isSending, reset: resetTransaction } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [endAt, setEndAt] = useState<number | null>(null)
  const [pendingAction, setPendingAction] = useState<Action>(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const [durationOpen, setDurationOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const enabled = isConnected && isContractConfigured
  const readAccount = enabled ? address : undefined

  const { data: profile, refetch: refetchProfile } = useReadContract({
    address: CLEARSPACE_ADDRESS,
    abi: clearspaceAbi,
    functionName: 'profileOf',
    args: readAccount ? [readAccount] : undefined,
    query: { enabled: Boolean(readAccount) },
  })

  const { data: globalSessions, refetch: refetchGlobal } = useReadContract({
    address: CLEARSPACE_ADDRESS,
    abi: clearspaceAbi,
    functionName: 'globalSessions',
    query: { enabled: isContractConfigured },
  })

  const today = BigInt(Math.floor(Date.now() / 86_400_000))
  const checkedToday = Boolean(profile && profile.lastCheckInDay === today)
  const busy = isSending || isConfirming
  const totalSeconds = minutes * 60
  const progress = timerState === 'complete' ? 1 : 1 - secondsLeft / totalSeconds
  const circumference = 2 * Math.PI * 142
  const strokeOffset = circumference * (1 - Math.max(0, Math.min(progress, 1)))

  useEffect(() => {
    if (timerState !== 'running' || !endAt) return
    const tick = () => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setSecondsLeft(next)
      if (next === 0) {
        setTimerState('complete')
        setEndAt(null)
      }
    }
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [endAt, timerState])

  useEffect(() => {
    if (!isSuccess || !pendingAction) return
    setNotice(pendingAction === 'session' ? 'Focus session preserved on Base.' : 'Daily check-in confirmed.')
    setPendingAction(null)
    void refetchProfile()
    void refetchGlobal()
    if (timerState === 'complete') resetTimer()
  }, [isSuccess])

  const focusLabel = useMemo(() => {
    if (timerState === 'running') return 'Stay with one thing.'
    if (timerState === 'paused') return 'Your space is paused.'
    if (timerState === 'complete') return 'Session complete.'
    return 'Make room for focus.'
  }, [timerState])

  function chooseDuration(value: number) {
    setMinutes(value)
    setSecondsLeft(value * 60)
    setTimerState('idle')
    setEndAt(null)
    setDurationOpen(false)
  }

  function startTimer() {
    setNotice('')
    setTimerState('running')
    setEndAt(Date.now() + secondsLeft * 1000)
  }

  function pauseTimer() {
    setTimerState('paused')
    setEndAt(null)
  }

  function resetTimer() {
    setTimerState('idle')
    setSecondsLeft(minutes * 60)
    setEndAt(null)
  }

  async function sendAction(action: Exclude<Action, null>) {
    setNotice('')
    resetTransaction()
    if (!isConnected) {
      setWalletOpen(true)
      return
    }
    if (!isContractConfigured) {
      setNotice('Contract address required in src/config/contract.ts.')
      return
    }

    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id })
      setPendingAction(action)
      const data = encodeFunctionData({
        abi: clearspaceAbi,
        functionName: action === 'session' ? 'completeSession' : 'dailyCheckIn',
        args: action === 'session' ? [minutes] : [],
      })
      await sendTransactionAsync({
        to: CLEARSPACE_ADDRESS,
        data,
        chainId: base.id,
        ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
      })
    } catch (error) {
      setNotice((error instanceof Error ? error.message : 'Transaction cancelled.').split('\n')[0])
      setPendingAction(null)
    }
  }

  function connectWallet(index: number) {
    const connector = connectors[index]
    if (!connector) return
    connect({ connector, chainId: base.id }, { onSuccess: () => setWalletOpen(false) })
  }

  return (
    <div className={`app-shell state-${timerState}`}>
      <header className="topbar">
        <a className="brand" href="#focus" aria-label="Clearspace home">
          <span className="brand-mark"><span /></span>
          <span>Clearspace</span>
        </a>
        <div className="top-actions">
          <span className="network"><i /> Base</span>
          {isConnected ? (
            <div className="account-chip">
              <span>{shortAddress(address)}</span>
              <button type="button" onClick={() => disconnect()} aria-label="Disconnect"><LogOut size={16} /></button>
            </div>
          ) : (
            <button className="connect-button" type="button" onClick={() => setWalletOpen(true)}>
              <Wallet size={17} /> Connect
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="focus-stage" id="focus">
          <div className="stage-copy">
            <p className="eyebrow">Quiet focus, preserved onchain</p>
            <h1>{focusLabel}</h1>
            <p>One timer. No feed. No noise.</p>
          </div>

          <div className="timer-wrap">
            <svg className="progress-ring" viewBox="0 0 320 320" aria-hidden="true">
              <circle className="ring-track" cx="160" cy="160" r="142" />
              <circle
                className="ring-value"
                cx="160" cy="160" r="142"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="timer-content">
              <div className="duration-control">
                <button
                  type="button"
                  disabled={timerState !== 'idle'}
                  onClick={() => setDurationOpen((open) => !open)}
                >
                  {minutes} min <ChevronDown size={15} />
                </button>
                {durationOpen && (
                  <div className="duration-menu">
                    {DURATIONS.map((value) => (
                      <button key={value} type="button" onClick={() => chooseDuration(value)}>{value} min</button>
                    ))}
                  </div>
                )}
              </div>
              <strong className="timer-digits">{formatTime(secondsLeft)}</strong>
              <span className="timer-caption">
                {timerState === 'complete' ? 'Ready to preserve' : timerState === 'running' ? 'Focus in progress' : 'Focus session'}
              </span>
            </div>
          </div>

          <div className="timer-actions">
            {timerState === 'idle' && (
              <button className="primary-action" type="button" onClick={startTimer}><Play size={20} fill="currentColor" /> Begin</button>
            )}
            {timerState === 'running' && (
              <button className="primary-action pause" type="button" onClick={pauseTimer}><Pause size={20} fill="currentColor" /> Pause</button>
            )}
            {timerState === 'paused' && (
              <>
                <button className="primary-action" type="button" onClick={startTimer}><Play size={20} fill="currentColor" /> Resume</button>
                <button className="icon-action" type="button" onClick={resetTimer} aria-label="Reset timer"><RotateCcw size={20} /></button>
              </>
            )}
            {timerState === 'complete' && (
              <>
                <button className="primary-action complete" type="button" disabled={busy} onClick={() => sendAction('session')}>
                  <Sparkles size={20} /> {busy && pendingAction === 'session' ? 'Preserving…' : `Preserve ${minutes} minutes`}
                </button>
                <button className="icon-action" type="button" onClick={resetTimer} aria-label="Discard session"><CircleStop size={20} /></button>
              </>
            )}
          </div>
          <p className="gas-note">Timer is free. Only the final Base transaction uses gas.</p>
        </section>

        <section className="daily-band" aria-labelledby="daily-title">
          <div className="daily-icon"><Flame size={22} /></div>
          <div className="daily-copy">
            <span>Daily return</span>
            <h2 id="daily-title">Keep the space open.</h2>
            <p>A separate daily check-in, even on rest days.</p>
          </div>
          <div className="streak">
            <strong>{Number(profile?.streak || 0n)}</strong>
            <span>day streak</span>
          </div>
          <button
            className={`checkin-button ${checkedToday ? 'done' : ''}`}
            type="button"
            disabled={busy || checkedToday}
            onClick={() => sendAction('checkin')}
          >
            {checkedToday ? <><Check size={18} /> Checked in</> : <><Clock3 size={18} /> {busy && pendingAction === 'checkin' ? 'Confirming…' : 'Check in'}</>}
          </button>
        </section>

        <section className="insights" aria-label="Focus statistics">
          <div><span>Total focus</span><strong>{Number(profile?.totalMinutes || 0n)}</strong><small>minutes</small></div>
          <div><span>Sessions</span><strong>{Number(profile?.sessions || 0n)}</strong><small>completed</small></div>
          <div><span>Best day</span><strong>{Number(profile?.bestDayMinutes || 0n)}</strong><small>minutes</small></div>
          <div><span>Across Clearspace</span><strong>{Number(globalSessions || 0n)}</strong><small>sessions</small></div>
        </section>

        {notice && <p className="notice" role="status">{notice}</p>}
      </main>

      <footer>
        <span>Clearspace</span>
        <span>No token. No app fee. Built on Base.</span>
      </footer>

      {walletOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setWalletOpen(false)}>
          <div className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setWalletOpen(false)}><X size={18} /></button>
            <span className="modal-symbol"><TimerReset size={24} /></span>
            <p className="modal-kicker">Base Mainnet</p>
            <h2 id="wallet-title">Enter your clearspace.</h2>
            <p>Connect once. Start the timer whenever you need it.</p>
            <div className="wallet-options">
              <button type="button" disabled={isConnecting} onClick={() => connectWallet(0)}>
                <span className="wallet-glyph"><Wallet size={20} /></span><span><strong>Browser wallet</strong><small>MetaMask, Rabby and more</small></span>
              </button>
              <button type="button" disabled={isConnecting} onClick={() => connectWallet(1)}>
                <span className="wallet-glyph base-glyph">B</span><span><strong>Base Account</strong><small>Coinbase smart wallet</small></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
