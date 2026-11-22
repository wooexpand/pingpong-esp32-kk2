import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LANGS, MsgKey, readLang, storeLang, text, type Lang } from './i18n';

type DeviceStatus = {
  connected: boolean;
  running: boolean;
  motor1: number;
  motor2: number;
  uptime_ms: number;
  outputs_enabled: boolean;
};

type StatusMsg = {
  t: 'status';
  running: boolean;
  a: number;
  b: number;
  pwm: boolean;
  up: number;
};

const EMPTY: DeviceStatus = {
  connected: false, running: false, motor1: 0, motor2: 0,
  uptime_ms: 0, outputs_enabled: false,
};

function socketUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  // In development Vite forwards /ws. On the board the browser connects to port 81 directly.
  if (import.meta.env.DEV) return `${proto}//${location.host}/ws`;
  return `${proto}//${location.hostname}:81/`;
}

const BrightnessSlider = memo(function BrightnessSlider({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <div className="motor">
    <label htmlFor={id}>{label} <strong>{value}%</strong></label>
    <input id={id} type="range" min={0} max={100} step={1} value={value} onChange={event => onChange(Number(event.target.value))} />
    <div className="scale"><span>0%</span><span>100%</span></div>
  </div>;
});

export default function App() {
  const [motor1, setMotor1] = useState(50);
  const [motor2, setMotor2] = useState(50);
  const [status, setStatus] = useState<DeviceStatus>(EMPTY);
  const [message, setMessage] = useState<MsgKey>('notConnected');
  const [lang, setLang] = useState<Lang>(readLang);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const desired = useRef({ motor1: 50, motor2: 50 });
  const running = useRef(false);
  const socket = useRef<WebSocket | null>(null);
  const sendTimer = useRef<number | null>(null);
  const lastSent = useRef(0);
  const pending = useRef<'start' | 'stop' | null>(null);

  const send = useCallback((body: string) => {
    const ws = socket.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(body);
  }, []);

  const flushLevel = useCallback(() => {
    sendTimer.current = null;
    lastSent.current = performance.now();
    if (!running.current) return;
    const { motor1: a, motor2: b } = desired.current;
    send(`{"t":"level","a":${a},"b":${b}}`);
    setStatus(current => ({ ...current, motor1: a, motor2: b }));
  }, [send]);

  const scheduleLevel = useCallback(() => {
    if (!running.current) return;
    if (sendTimer.current != null) return;
    const wait = 30 - (performance.now() - lastSent.current);
    if (wait <= 0) flushLevel();
    else sendTimer.current = window.setTimeout(flushLevel, wait);
  }, [flushLevel]);

  const changeLed = useCallback((which: 1 | 2, value: number) => {
    if (which === 1) {
      desired.current.motor1 = value;
      setMotor1(value);
    } else {
      desired.current.motor2 = value;
      setMotor2(value);
    }
    scheduleLevel();
  }, [scheduleLevel]);

  const change1 = useCallback((value: number) => changeLed(1, value), [changeLed]);
  const change2 = useCallback((value: number) => changeLed(2, value), [changeLed]);

  const stop = useCallback(() => {
    running.current = false;
    if (sendTimer.current != null) {
      window.clearTimeout(sendTimer.current);
      sendTimer.current = null;
    }
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setMessage('stopUnconfirmed');
      return;
    }
    pending.current = 'stop';
    setBusy(true);
    send('{"t":"stop"}');
  }, [send]);

  const start = useCallback(() => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setMessage('startFailed');
      return;
    }
    pending.current = 'start';
    setBusy(true);
    send('{"t":"start"}');
  }, [send]);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    const ws = new WebSocket(socketUrl());
    socket.current = ws;

    ws.onopen = () => {
      if (closed) return;
      setStatus(current => ({ ...current, connected: true }));
    };
    ws.onmessage = event => {
      if (closed || typeof event.data !== 'string') return;
      let msg: StatusMsg;
      try { msg = JSON.parse(event.data) as StatusMsg; } catch { return; }
      if (msg.t !== 'status') return;
      running.current = msg.running;
      setStatus({
        connected: true,
        running: msg.running,
        motor1: msg.a,
        motor2: msg.b,
        uptime_ms: msg.up,
        outputs_enabled: msg.pwm,
      });
      setMessage(msg.pwm ? 'connectedPwm' : 'connectedSim');
      if (pending.current === 'start' && msg.running) {
        pending.current = null;
        setBusy(false);
        setMessage('startOk');
        flushLevel();
      } else if (pending.current === 'stop' && !msg.running) {
        pending.current = null;
        setBusy(false);
        setMessage('stopSent');
      }
    };
    ws.onerror = () => { if (!closed) ws.close(); };
    ws.onclose = () => {
      if (closed) return;
      const wasRunning = running.current;
      running.current = false;
      pending.current = null;
      setBusy(false);
      setStatus(EMPTY);
      setMessage(wasRunning ? 'linkLost' : 'connectFailed');
      retry = window.setTimeout(() => { if (!closed) setAttempt(value => value + 1); }, 2000);
    };

    return () => {
      closed = true;
      window.clearTimeout(retry);
      if (sendTimer.current != null) window.clearTimeout(sendTimer.current);
      sendTimer.current = null;
      ws.close();
      if (socket.current === ws) socket.current = null;
    };
  }, [attempt, flushLevel]);

  useEffect(() => {
    // Page still open and sliders idle: resend the current brightness so the one-minute timeout does not turn the LEDs off.
    const id = window.setInterval(() => {
      if (!running.current || sendTimer.current != null) return;
      flushLevel();
    }, 5000);
    return () => window.clearInterval(id);
  }, [flushLevel]);

  useEffect(() => {
    const hide = () => { if (document.hidden && running.current) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);

  useEffect(() => { storeLang(lang); }, [lang]);

  useEffect(() => {
    if (!linkOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setLinkOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [linkOpen]);

  const preset = (a: number, b: number) => {
    desired.current = { motor1: a, motor2: b };
    setMotor1(a);
    setMotor2(b);
    scheduleLevel();
  };
  const online = status.connected;
  const t = text(lang);
  const choose = (next: Lang) => { setLang(next); storeLang(next); };
  return <main className="shell">
    <header>
      <div className="top"><div className="brand"><img src="/icons/icon-192.png" alt=""/><div><h1>KK2 LED</h1><span>{t.tagline}</span></div></div><button type="button" className={`pill ${online ? 'ok' : ''}`} aria-haspopup="dialog" aria-expanded={linkOpen} onClick={() => setLinkOpen(true)}>{online ? t.connected : t.disconnected}</button></div>
      <div className="langs" role="group" aria-label={t.language}>{LANGS.map(item => <button key={item.id} type="button" className={item.id === lang ? 'on' : ''} aria-pressed={item.id === lang} onClick={() => choose(item.id)}>{item.label}</button>)}</div>
    </header>
    <section className="hero"><p className="eyebrow">KK2 / PROTOTYPE V0.1</p><h2>{t.title}</h2><p>{t.lead}</p><div className="network">{t.network} <span>192.168.4.1</span></div></section>
    {linkOpen && <div className="overlay" onClick={() => setLinkOpen(false)}><section className="panel dialog" role="dialog" aria-modal="true" aria-labelledby="link-title" onClick={event => event.stopPropagation()}><div className="panelhead"><h3 id="link-title">{t.linkHeading}</h3><div className="dialog-actions"><button type="button" className="quiet" onClick={() => setAttempt(value => value + 1)}>{t.refresh}</button><button type="button" className="quiet" onClick={() => setLinkOpen(false)}>{t.close}</button></div></div><p className="hint">{t.msg[message]}</p><p className="small">{status.outputs_enabled ? t.pwmOn : t.pwmOff}</p></section></div>}
    <section className="panel controls"><div className="panelhead"><h3>{t.speedHeading}</h3><span className="small">{t.duty}</span></div>
      <BrightnessSlider id="m1" label={t.upper} value={motor1} onChange={change1} />
      <BrightnessSlider id="m2" label={t.lower} value={motor2} onChange={change2} />
      <p className="small">{t.presetNote}</p>
      <div className="presets"><button onClick={() => preset(60, 60)}>{t.flat}</button><button onClick={() => preset(80, 40)}>{t.diffHigh}</button><button onClick={() => preset(40, 80)}>{t.diffLow}</button></div>
      <div className="actions"><button className="start" disabled={!online || busy || status.running} onClick={start}>{t.start}</button><button className="stop" disabled={!online || busy} onClick={stop}>{t.stop}</button></div>
    </section>
    <section className="panel stats"><div><span>{t.state}</span><strong>{status.running ? t.running : t.stopped}</strong></div><div><span>{t.received}</span><strong>{status.motor1}% / {status.motor2}%</strong></div><div><span>{t.uptime}</span><strong>{Math.floor(status.uptime_ms / 1000)} s</strong></div></section>
    <footer>{t.footer}</footer>
  </main>;
}
