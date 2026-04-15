import { useEffect, useState } from "react";
import Lottie from "lottie-react";

const SUCCESS_LOTTIE = "https://lottie.host/1958bcef-1db0-49d7-9119-cb200aaf16b9/v46NF7KgVW.json";

const BASE = "/api/whatsapp";

interface StatusData {
  ready: boolean;
  hasQrCode: boolean;
  qrCode: string | null;
  error: string | null;
  activeSessions: number;
}

type ViewState = "loading" | "qr" | "connected" | "error" | "initializing";

function useStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const r = await fetch(BASE + "/status");
        if (!r.ok) throw new Error("non-ok");
        const json: StatusData = await r.json();
        if (alive) {
          setData(json);
          setFetchError(false);
        }
      } catch {
        if (alive) setFetchError(true);
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return { data, fetchError };
}

function getViewState(data: StatusData | null, fetchError: boolean): ViewState {
  if (fetchError) return "error";
  if (!data) return "loading";
  if (data.ready) return "connected";
  if (data.hasQrCode) return "qr";
  if (data.error) return "error";
  return "initializing";
}

function Spinner() {
  return <div className="spinner" />;
}

function StatusBadge({ state }: { state: ViewState }) {
  const map: Record<ViewState, { label: string; cls: string; pulse: boolean }> = {
    connected:   { label: "Bot Online",        cls: "badge-green",  pulse: false },
    qr:          { label: "Aguardando QR Code", cls: "badge-yellow", pulse: true  },
    initializing:{ label: "Inicializando…",    cls: "badge-blue",   pulse: true  },
    loading:     { label: "Verificando…",       cls: "badge-gray",   pulse: true  },
    error:       { label: "Erro de conexão",    cls: "badge-red",    pulse: false },
  };
  const { label, cls, pulse } = map[state];
  return (
    <span className={`badge ${cls}`}>
      <span className={`dot ${pulse ? "pulse" : ""}`} />
      {label}
    </span>
  );
}

function QrView({ qrTs }: { qrTs: number }) {
  const src = `${BASE}/qr.png?t=${qrTs}`;
  return (
    <div className="section">
      <p className="hint"><strong>Abra o WhatsApp</strong> no seu celular</p>
      <p className="hint">Toque em <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong></p>
      <div className="qr-box">
        <img src={src} alt="QR Code WhatsApp" className="qr-img" />
      </div>
      <p className="hint-small">Escaneie o código acima para conectar o bot</p>
    </div>
  );
}

function useLottie(url: string) {
  const [data, setData] = useState<object | null>(null);
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData).catch(() => null);
  }, [url]);
  return data;
}

function ConnectedView({ sessions }: { sessions: number }) {
  const lottieData = useLottie(SUCCESS_LOTTIE);
  const [disconnecting, setDisconnecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!confirm("Tem certeza que deseja desconectar o dispositivo? Será necessário escanear o QR Code novamente.")) return;
    setDisconnecting(true);
    setMsg(null);
    try {
      const r = await fetch(BASE + "/disconnect", { method: "POST" });
      const d = await r.json();
      setMsg(d.message || "Desconectado.");
    } catch {
      setMsg("Erro ao desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="section centered">
      {lottieData
        ? <Lottie animationData={lottieData} loop={false} className="lottie-success" />
        : <div className="check-icon">✅</div>
      }
      <h2 className="connected-title">Bot Conectado</h2>
      <p className="connected-sub">O bot está ativo e respondendo mensagens automaticamente.</p>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{sessions}</span>
          <span className="stat-label">Sessões ativas</span>
        </div>
      </div>
      {msg && <p className="disconnect-msg">{msg}</p>}
      <button className="disconnect-btn" onClick={handleDisconnect} disabled={disconnecting}>
        {disconnecting ? "Desconectando…" : "🔌 Desconectar dispositivo"}
      </button>
    </div>
  );
}

function InitView() {
  return (
    <div className="section centered">
      <Spinner />
      <p className="hint-center">Iniciando o bot, aguarde…</p>
    </div>
  );
}

function ErrorView({ message }: { message?: string | null }) {
  return (
    <div className="section centered">
      <div className="error-icon">⚠️</div>
      <p className="error-text">{message || "Não foi possível conectar ao servidor."}</p>
    </div>
  );
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy} title="Copiar">
      {copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

// ─── API DOCS ─────────────────────────────────────────────────────────────────

interface EndpointResult {
  loading: boolean;
  status: number | null;
  body: string | null;
  error: string | null;
}

function ResultBox({ result }: { result: EndpointResult }) {
  if (result.loading) return <div className="result-box loading-result"><Spinner />Executando…</div>;
  if (result.error)  return <div className="result-box error-result"><span className="res-label err">ERRO</span>{result.error}</div>;
  if (result.body === null) return null;
  const ok = result.status !== null && result.status < 400;
  return (
    <div className={`result-box ${ok ? "ok-result" : "error-result"}`}>
      <span className={`res-label ${ok ? "ok" : "err"}`}>HTTP {result.status}</span>
      <pre>{result.body}</pre>
    </div>
  );
}

async function runRequest(
  method: string,
  url: string,
  headers?: Record<string, string>,
  body?: object,
): Promise<{ status: number; body: string }> {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  let text = "";
  try { text = JSON.stringify(await r.json(), null, 2); } catch { text = await r.text(); }
  return { status: r.status, body: text };
}

function StatusEndpoint() {
  const url = `${window.location.origin}/api/whatsapp/status`;
  const curl = `curl ${url}`;
  const curlDisplay = `curl /api/whatsapp/status`;
  const [res, setRes] = useState<EndpointResult>({ loading: false, status: null, body: null, error: null });

  async function run() {
    setRes({ loading: true, status: null, body: null, error: null });
    try {
      const { status, body } = await runRequest("GET", url);
      setRes({ loading: false, status, body, error: null });
    } catch (e) {
      setRes({ loading: false, status: null, body: null, error: String(e) });
    }
  }

  return (
    <div className="ep-block">
      <div className="ep-header">
        <span className="method get">GET</span>
        <code className="ep-path">/api/whatsapp/status</code>
        <span className="ep-desc">Status do bot</span>
      </div>
      <div className="ep-curl">
        <span className="curl-label">curl</span>
        <code>{curlDisplay}</code>
        <CopyButton text={curl} />
      </div>
      <button className="test-btn" onClick={run} disabled={res.loading}>▶ Testar</button>
      <ResultBox result={res} />
    </div>
  );
}

function SendEndpoint() {
  const [to, setTo]         = useState("551199999999");
  const [msg, setMsg]       = useState("Olá! Mensagem de teste.");
  const [apiKey, setApiKey] = useState("");
  const [res, setRes]       = useState<EndpointResult>({ loading: false, status: null, body: null, error: null });

  const url  = `${window.location.origin}/api/whatsapp/send`;
  const curl = `curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: SUA_API_KEY" \\\n  -d '{"to":"551199999999","message":"Olá!"}'`;
  const curlDisplay = `curl -X POST /api/whatsapp/send \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: SUA_API_KEY" \\\n  -d '{"to":"551199999999","message":"Olá!"}'`;

  async function run() {
    setRes({ loading: true, status: null, body: null, error: null });
    try {
      const { status, body } = await runRequest("POST", url, { "x-api-key": apiKey }, { to, message: msg });
      setRes({ loading: false, status, body, error: null });
    } catch (e) {
      setRes({ loading: false, status: null, body: null, error: String(e) });
    }
  }

  return (
    <div className="ep-block">
      <div className="ep-header">
        <span className="method post">POST</span>
        <code className="ep-path">/api/whatsapp/send</code>
        <span className="ep-desc">Enviar mensagem</span>
      </div>
      <div className="ep-curl">
        <span className="curl-label">curl</span>
        <code style={{ whiteSpace: "pre" }}>{curlDisplay}</code>
        <CopyButton text={curl} />
      </div>
      <div className="ep-form">
        <label className="ep-field">
          <span>x-api-key</span>
          <input className="ep-input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sua chave de API" />
        </label>
        <label className="ep-field">
          <span>to</span>
          <input className="ep-input" value={to} onChange={e => setTo(e.target.value)} placeholder="551199999999" />
        </label>
        <label className="ep-field">
          <span>message</span>
          <input className="ep-input" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Mensagem" />
        </label>
      </div>
      <button className="test-btn" onClick={run} disabled={res.loading}>▶ Testar</button>
      <ResultBox result={res} />
    </div>
  );
}

function SessionsEndpoint() {
  const url  = `${window.location.origin}/api/whatsapp/sessions`;
  const curl = `curl ${url}`;
  const [res, setRes] = useState<EndpointResult>({ loading: false, status: null, body: null, error: null });

  async function run() {
    setRes({ loading: true, status: null, body: null, error: null });
    try {
      const { status, body } = await runRequest("GET", url);
      setRes({ loading: false, status, body, error: null });
    } catch (e) {
      setRes({ loading: false, status: null, body: null, error: String(e) });
    }
  }

  return (
    <div className="ep-block">
      <div className="ep-header">
        <span className="method get">GET</span>
        <code className="ep-path">/api/whatsapp/sessions</code>
        <span className="ep-desc">Sessões ativas</span>
      </div>
      <div className="ep-curl">
        <span className="curl-label">curl</span>
        <code>{curl}</code>
        <CopyButton text={curl} />
      </div>
      <button className="test-btn" onClick={run} disabled={res.loading}>▶ Testar</button>
      <ResultBox result={res} />
    </div>
  );
}

function DisconnectEndpoint() {
  const url  = `${window.location.origin}/api/whatsapp/disconnect`;
  const curl = `curl -X POST ${url}`;
  const [res, setRes] = useState<EndpointResult>({ loading: false, status: null, body: null, error: null });

  async function run() {
    if (!confirm("Isso vai desconectar o bot. Continuar?")) return;
    setRes({ loading: true, status: null, body: null, error: null });
    try {
      const { status, body } = await runRequest("POST", url);
      setRes({ loading: false, status, body, error: null });
    } catch (e) {
      setRes({ loading: false, status: null, body: null, error: String(e) });
    }
  }

  return (
    <div className="ep-block">
      <div className="ep-header">
        <span className="method post">POST</span>
        <code className="ep-path">/api/whatsapp/disconnect</code>
        <span className="ep-desc">Desconectar bot</span>
      </div>
      <div className="ep-curl">
        <span className="curl-label">curl</span>
        <code>{curl}</code>
        <CopyButton text={curl} />
      </div>
      <button className="test-btn danger" onClick={run} disabled={res.loading}>▶ Testar</button>
      <ResultBox result={res} />
    </div>
  );
}

function ApiDocs() {
  return (
    <div className="api-docs-card">
      <h3 className="api-title">Referência da API</h3>
      <p className="api-subtitle">Base URL: <code className="base-url">{window.location.origin}</code></p>
      <div className="ep-list">
        <StatusEndpoint />
        <SendEndpoint />
        <SessionsEndpoint />
        <DisconnectEndpoint />
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { data, fetchError } = useStatus();
  const state = getViewState(data, fetchError);
  const [qrTs] = useState(() => Date.now());

  return (
    <div className="page">
      <header className="header">
        <div className="logo">
          <img src="https://isound.digital/logos/isound-favicon%20(1).svg" alt="iSound" className="logo-img" />
        </div>
        <div>
          <h1 className="title">iSound WhatsApp Bot</h1>
          <p className="subtitle">Dashboard de Gerenciamento</p>
        </div>
      </header>

      <div className="card">
        <StatusBadge state={state} />
        {state === "qr"          && <QrView qrTs={qrTs} />}
        {state === "connected"   && <ConnectedView sessions={data?.activeSessions ?? 0} />}
        {state === "initializing"&& <InitView />}
        {state === "loading"     && <InitView />}
        {state === "error"       && <ErrorView message={fetchError ? null : data?.error} />}
      </div>

      <ApiDocs />

      <p className="footer-note">Atualiza automaticamente a cada 3 segundos</p>

      <footer className="footer-copyright">
        &copy; {new Date().getFullYear()} iSound. Todos os direitos reservados.
      </footer>
    </div>
  );
}
