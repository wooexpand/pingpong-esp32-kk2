export type Lang = 'sv' | 'en' | 'zh';

export type MsgKey =
  | 'notConnected'
  | 'connectedPwm'
  | 'connectedSim'
  | 'connectFailed'
  | 'stopSent'
  | 'stopUnconfirmed'
  | 'startOk'
  | 'startFailed'
  | 'linkLost'
  | 'hiddenStop';

type Copy = {
  language: string;
  tagline: string;
  connected: string;
  disconnected: string;
  title: string;
  lead: string;
  network: string;
  linkHeading: string;
  refresh: string;
  close: string;
  pwmOn: string;
  pwmOff: string;
  speedHeading: string;
  duty: string;
  upper: string;
  lower: string;
  presetNote: string;
  flat: string;
  diffHigh: string;
  diffLow: string;
  start: string;
  stop: string;
  state: string;
  running: string;
  stopped: string;
  received: string;
  uptime: string;
  footer: string;
  msg: Record<MsgKey, string>;
};

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'sv', label: 'SV' },
  { id: 'en', label: 'EN' },
  { id: 'zh', label: '中文' },
];

const copy: Record<Lang, Copy> = {
  sv: {
    language: 'Språk',
    tagline: 'ESP32-S3 · ljusstyrka',
    connected: '● Ansluten',
    disconnected: '○ Ej ansluten',
    title: 'Ljusstyrka för två lysdioder',
    lead: 'Anslut via ESP32-Wi-Fi och ställ in ljusstyrkan på de två lysdioderna var för sig.',
    network: 'Nätverk: PingPong-ESP32',
    linkHeading: 'Enhetsanslutning',
    refresh: 'Uppdatera',
    close: 'Stäng',
    pwmOn: 'PWM är på. De två lysdioderna följer reglagen.',
    pwmOff: 'PWM är av: bara serieutskrift, lysdioderna tänds inte.',
    speedHeading: 'Ljusstyrka',
    duty: '0–100 % ljusstyrka',
    upper: 'Lysdiod 1',
    lower: 'Lysdiod 2',
    presetNote: 'Förinställningarna sätter bara två ljusstyrkor.',
    flat: 'Lika 60/60',
    diffHigh: 'LED 1 starkare 80/40',
    diffLow: 'LED 2 starkare 40/80',
    start: '▶ Starta',
    stop: '■ STOPP',
    state: 'Enhetsstatus',
    running: 'KÖRS',
    stopped: 'STOPPAD',
    received: 'Enheten tog emot LED 1 / LED 2',
    uptime: 'Drifttid',
    footer: 'KK2 · Webb → REST API → ESP32-S3 · V0.1',
    msg: {
      notConnected: 'Inte ansluten till enheten',
      connectedPwm: 'Ansluten · PWM till lysdioderna',
      connectedSim: 'Ansluten · bara serieutskrift',
      connectFailed: 'Anslutningen misslyckades. Kontrollera ESP32-Wi-Fi.',
      stopSent: 'STOPP skickat',
      stopUnconfirmed: 'STOPP bekräftades inte. Kontrollera enheten.',
      startOk: 'Startad. Ljusstyrkan skickas fortlöpande.',
      startFailed: 'Starten misslyckades. Anslut först till ESP32-Wi-Fi.',
      linkLost: 'Kommunikationen bröts. Tidsgränsen släcker lysdioderna.',
      hiddenStop: 'Sidan är i bakgrunden. Stopp har begärts.',
    },
  },
  en: {
    language: 'Language',
    tagline: 'ESP32-S3 · brightness',
    connected: '● Connected',
    disconnected: '○ Not connected',
    title: 'Brightness for two LEDs',
    lead: 'Connect over ESP32 Wi-Fi and set the brightness of the two LEDs independently.',
    network: 'Network: PingPong-ESP32',
    linkHeading: 'Device link',
    refresh: 'Refresh',
    close: 'Close',
    pwmOn: 'PWM is on. The two LEDs follow the sliders.',
    pwmOff: 'PWM is off: serial print only, the LEDs stay dark.',
    speedHeading: 'Brightness',
    duty: '0–100% brightness',
    upper: 'LED 1',
    lower: 'LED 2',
    presetNote: 'Presets only set two brightness levels.',
    flat: 'Equal 60/60',
    diffHigh: 'LED 1 brighter 80/40',
    diffLow: 'LED 2 brighter 40/80',
    start: '▶ Start',
    stop: '■ STOP',
    state: 'Device state',
    running: 'RUNNING',
    stopped: 'STOPPED',
    received: 'Device received LED 1 / LED 2',
    uptime: 'Uptime',
    footer: 'KK2 · Web UI → REST API → ESP32-S3 · V0.1',
    msg: {
      notConnected: 'Not connected to the device',
      connectedPwm: 'Connected · PWM to the LEDs',
      connectedSim: 'Connected · serial print only',
      connectFailed: 'Connection failed. Check the ESP32 Wi-Fi.',
      stopSent: 'STOP sent',
      stopUnconfirmed: 'STOP was not confirmed. Check the device.',
      startOk: 'Started. Brightness is being sent continuously.',
      startFailed: 'Start failed. Connect to the ESP32 Wi-Fi first.',
      linkLost: 'Link lost. The timeout turns the LEDs off.',
      hiddenStop: 'Page moved to the background. Stop was requested.',
    },
  },
  zh: {
    language: '语言',
    tagline: 'ESP32-S3 · 亮度',
    connected: '● 已连接',
    disconnected: '○ 未连接',
    title: '两颗 LED 的亮度',
    lead: '通过 ESP32 Wi-Fi 连接，分别调节两颗 LED 的亮度。',
    network: '网络：PingPong-ESP32',
    linkHeading: '设备连接',
    refresh: '刷新状态',
    close: '关闭',
    pwmOn: 'PWM 已打开。两颗 LED 跟随滑块。',
    pwmOff: 'PWM 已关闭：只打印串口，LED 不亮。',
    speedHeading: '亮度',
    duty: '0–100% 亮度',
    upper: 'LED 1',
    lower: 'LED 2',
    presetNote: '预设只是两组亮度，不是电机转速。',
    flat: '同样亮 60/60',
    diffHigh: 'LED 1 更亮 80/40',
    diffLow: 'LED 2 更亮 40/80',
    start: '▶ 开始',
    stop: '■ 停止',
    state: '设备状态',
    running: '运行中',
    stopped: '已停止',
    received: '设备收到 LED 1 / LED 2',
    uptime: '运行时间',
    footer: 'KK2 · 网页 → REST API → ESP32-S3 · V0.1',
    msg: {
      notConnected: '尚未连接设备',
      connectedPwm: '已连接 · PWM 驱动 LED',
      connectedSim: '已连接 · 只打印串口',
      connectFailed: '连接失败，请检查 ESP32 Wi-Fi',
      stopSent: '已发送停止',
      stopUnconfirmed: '停止请求未确认！请检查设备',
      startOk: '已开始。正在持续发送亮度。',
      startFailed: '启动失败：请先连接 ESP32 Wi-Fi',
      linkLost: '通信中断。超时后 LED 会熄灭。',
      hiddenStop: '页面进入后台：已请求停止',
    },
  },
};

const STORAGE_KEY = 'pingpong-lang';

export function readLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'sv' || saved === 'en' || saved === 'zh') return saved;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('sv')) return 'sv';
  if (nav.startsWith('zh')) return 'zh';
  return 'en';
}

export function storeLang(lang: Lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
}

export function text(lang: Lang): Copy {
  return copy[lang];
}
