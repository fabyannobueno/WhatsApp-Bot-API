import { useEffect, useState } from "react";

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
  return (
    <div className="spinner" />
  );
}

function StatusBadge({ state }: { state: ViewState }) {
  const map: Record<ViewState, { label: string; cls: string; pulse: boolean }> = {
    connected: { label: "Bot Online", cls: "badge-green", pulse: false },
    qr: { label: "Aguardando QR Code", cls: "badge-yellow", pulse: true },
    initializing: { label: "Inicializando…", cls: "badge-blue", pulse: true },
    loading: { label: "Verificando…", cls: "badge-gray", pulse: true },
    error: { label: "Erro de conexão", cls: "badge-red", pulse: false },
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

function ConnectedView({ sessions }: { sessions: number }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!confirm("Tem certeza que deseja desconectar o dispositivo? Será necessário escanear o QR Code novamente.")) return;
    setDisconnecting(true);
    setMsg(null);
    try {
      const r = await fetch(BASE + "/disconnect", { method: "POST" });
      const data = await r.json();
      setMsg(data.message || "Desconectado.");
    } catch {
      setMsg("Erro ao desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="section centered">
      <div className="check-icon">✅</div>
      <h2 className="connected-title">Bot Conectado</h2>
      <p className="connected-sub">O bot está ativo e respondendo mensagens automaticamente.</p>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{sessions}</span>
          <span className="stat-label">Sessões ativas</span>
        </div>
      </div>
      {msg && <p className="disconnect-msg">{msg}</p>}
      <button
        className="disconnect-btn"
        onClick={handleDisconnect}
        disabled={disconnecting}
      >
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
          <h1 className="title"><span className="green">iSound</span> WhatsApp Bot</h1>
          <p className="subtitle">Dashboard de Gerenciamento</p>
        </div>
      </header>

      <div className="card">
        <StatusBadge state={state} />

        {state === "qr" && <QrView qrTs={qrTs} />}
        {state === "connected" && <ConnectedView sessions={data?.activeSessions ?? 0} />}
        {state === "initializing" && <InitView />}
        {state === "loading" && <InitView />}
        {state === "error" && <ErrorView message={fetchError ? null : data?.error} />}
      </div>

      <div className="api-card">
        <h3 className="api-title">Enviar Mensagem via API</h3>
        <div className="code-block">
          <pre>{`POST /api/whatsapp/send\nContent-Type: application/json\n\n{\n  "to": "5511999999999",\n  "message": "Sua mensagem aqui"\n}`}</pre>
        </div>
        <div className="endpoints">
          <div className="endpoint"><span className="method get">GET</span><code>/api/whatsapp/status</code></div>
          <div className="endpoint"><span className="method post">POST</span><code>/api/whatsapp/send</code></div>
          <div className="endpoint"><span className="method get">GET</span><code>/api/whatsapp/sessions</code></div>
          <div className="endpoint"><span className="method post">POST</span><code>/api/whatsapp/disconnect</code></div>
        </div>
      </div>

      <p className="footer-note">Atualiza automaticamente a cada 3 segundos</p>
    </div>
  );
}
