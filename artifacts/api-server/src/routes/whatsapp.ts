import { Router } from 'express';
import { sendMessage, getBotStatus } from '../whatsapp/bot.js';
import { getAllSessions, getSessionCount } from '../whatsapp/session.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode') as {
  toDataURL: (text: string, opts?: Record<string, unknown>) => Promise<string>;
};

const router = Router();

router.get('/whatsapp/status', (req, res) => {
  const status = getBotStatus();
  res.json({
    ready: status.ready,
    hasQrCode: status.qrCode !== null,
    qrCode: status.qrCode,
    error: status.error,
    activeSessions: getSessionCount(),
  });
});

router.get('/whatsapp/qr.png', async (req, res) => {
  const status = getBotStatus();

  if (!status.qrCode) {
    res.status(404).json({ error: status.ready ? 'Already connected' : 'QR code not available yet' });
    return;
  }

  try {
    const dataUrl = await QRCode.toDataURL(status.qrCode, {
      width: 320,
      margin: 2,
      color: { dark: '#128C7E', light: '#ffffff' },
    });
    const base64 = dataUrl.replace('data:image/png;base64,', '');
    const buf = Buffer.from(base64, 'base64');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache, no-store');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code image' });
  }
});

router.get('/whatsapp/dashboard', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-cache');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>iSound — WhatsApp Bot</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b1118;
      color: #e5e7eb;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 32px 16px;
    }
    header {
      width: 100%;
      max-width: 520px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }
    .logo {
      width: 40px;
      height: 40px;
      background: #25d366;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    h1 { font-size: 20px; font-weight: 700; color: #fff; }
    h1 span { color: #25d366; }
    .card {
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 520px;
      text-align: center;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .status-badge.connected { background: #0d3321; color: #25d366; }
    .status-badge.waiting { background: #1e2a1a; color: #78c257; }
    .status-badge.loading { background: #1e2533; color: #79b8ff; }
    .status-badge.error { background: #2d1b1b; color: #f85149; }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    .dot.pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin-bottom: 20px;
    }
    .qr-wrap img { display: block; width: 220px; height: 220px; }
    .qr-hint { font-size: 13px; color: #8b949e; line-height: 1.5; margin-bottom: 4px; }
    .qr-hint b { color: #c9d1d9; }
    .connected-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .connected-title { font-size: 22px; font-weight: 700; color: #25d366; margin-bottom: 8px; }
    .connected-sub { font-size: 14px; color: #8b949e; }
    .stats {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      justify-content: center;
    }
    .stat {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 10px;
      padding: 12px 20px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 11px; color: #8b949e; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #21262d;
      border-top-color: #25d366;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: #8b949e; font-size: 14px; }
    .refresh-note { font-size: 12px; color: #484f58; margin-top: 20px; }
    .error-icon { font-size: 48px; margin-bottom: 12px; }
    .error-text { color: #f85149; font-size: 14px; word-break: break-word; }
  </style>
</head>
<body>
  <header>
    <div class="logo">💬</div>
    <div>
      <h1><span>iSound</span> WhatsApp Bot</h1>
    </div>
  </header>

  <div class="card" id="card">
    <div class="loading-spinner"></div>
    <div class="loading-text">Verificando status...</div>
  </div>

  <p class="refresh-note">Atualiza automaticamente a cada 3 segundos</p>

  <script>
    const BASE = window.location.origin + '/api/whatsapp';
    let lastState = null;

    async function poll() {
      try {
        const r = await fetch(BASE + '/status');
        const data = await r.json();
        render(data);
      } catch(e) {
        renderError('Não foi possível conectar ao servidor.');
      }
    }

    function render(data) {
      const card = document.getElementById('card');
      const state = data.ready ? 'connected' : data.hasQrCode ? 'qr' : data.error ? 'error' : 'loading';

      if (state === lastState && state !== 'qr') return;
      lastState = state;

      if (state === 'connected') {
        card.innerHTML = \`
          <div class="status-badge connected"><span class="dot"></span> Conectado</div>
          <div class="connected-icon">✅</div>
          <div class="connected-title">Bot Online</div>
          <div class="connected-sub">O bot está ativo e pronto para atender mensagens.</div>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">\${data.activeSessions}</div>
              <div class="stat-label">Sessões ativas</div>
            </div>
          </div>
        \`;
      } else if (state === 'qr') {
        const ts = Date.now();
        card.innerHTML = \`
          <div class="status-badge waiting"><span class="dot pulse"></span> Aguardando autenticação</div>
          <div class="qr-wrap">
            <img src="\${BASE}/qr.png?t=\${ts}" alt="QR Code WhatsApp" />
          </div>
          <p class="qr-hint">Abra o <b>WhatsApp</b> no seu celular</p>
          <p class="qr-hint">Toque em <b>Dispositivos conectados</b> → <b>Conectar dispositivo</b></p>
          <p class="qr-hint" style="margin-top:8px">Escaneie o QR Code acima</p>
        \`;
      } else if (state === 'error') {
        card.innerHTML = \`
          <div class="status-badge error"><span class="dot"></span> Erro</div>
          <div class="error-icon">⚠️</div>
          <div class="error-text">\${data.error || 'Erro desconhecido'}</div>
        \`;
      } else {
        card.innerHTML = \`
          <div class="status-badge loading"><span class="dot pulse"></span> Inicializando</div>
          <div class="loading-spinner"></div>
          <div class="loading-text">O bot está iniciando, aguarde...</div>
        \`;
      }
    }

    function renderError(msg) {
      document.getElementById('card').innerHTML = \`
        <div class="error-icon">🔌</div>
        <div class="error-text">\${msg}</div>
      \`;
    }

    poll();
    setInterval(poll, 3000);
  </script>
</body>
</html>`);
});

router.post('/whatsapp/send', async (req, res) => {
  const { to, message } = req.body as { to?: string; message?: string };

  if (!to || !message) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: "to" (phone number) and "message"',
    });
    return;
  }

  const phoneClean = to.replace(/\D/g, '');
  if (phoneClean.length < 10) {
    res.status(400).json({
      success: false,
      error: 'Invalid phone number. Use format: 5511999999999 (country code + DDD + number)',
    });
    return;
  }

  const result = await sendMessage(phoneClean, message);

  if (!result.success) {
    res.status(503).json(result);
    return;
  }

  res.json(result);
});

router.get('/whatsapp/sessions', (req, res) => {
  const sessions = getAllSessions().map((s) => ({
    phoneNumber: s.phoneNumber,
    state: s.state,
    startedAt: s.startedAt,
    lastActivityAt: s.lastActivityAt,
  }));

  res.json({ count: sessions.length, sessions });
});

export default router;
