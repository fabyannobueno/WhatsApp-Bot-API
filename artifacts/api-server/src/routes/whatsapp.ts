import { Router } from 'express';
import { sendMessage, getBotStatus } from '../whatsapp/bot.js';
import { getAllSessions, getSessionCount } from '../whatsapp/session.js';

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
