import { createRequire } from 'node:module';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../lib/logger.js';
import {
  botMessages,
  getMessage,
  getMenuOptions,
  getResponseAction,
  getEvaluationResponse,
} from './messages.js';
import {
  getSession,
  createSession,
  updateSession,
  endSession,
  setSessionTimeout,
} from './session.js';

const require = createRequire(import.meta.url);

const { Client, LocalAuth } = require('whatsapp-web.js') as {
  Client: new (options: Record<string, unknown>) => WhatsAppClient;
  LocalAuth: new (options?: Record<string, unknown>) => unknown;
};
const qrcode = require('qrcode-terminal') as { generate: (text: string, opts: Record<string, unknown>) => void };

interface WhatsAppMessage {
  from: string;
  fromMe: boolean;
  body: string;
  getContact: () => Promise<{ pushname?: string; name?: string }>;
}

interface WhatsAppClient {
  on: (event: string, handler: (...args: unknown[]) => void | Promise<void>) => void;
  initialize: () => Promise<void>;
  sendMessage: (to: string, message: string) => Promise<unknown>;
  destroy: () => Promise<void>;
}

let client: WhatsAppClient | null = null;
let clientReady = false;
let qrCodeData: string | null = null;
let initializationError: string | null = null;

const GREETING_TRIGGERS = ['oi', 'olá', 'ola', 'ola!', 'oi!', 'hello', 'hi', 'bom dia', 'boa tarde', 'boa noite', 'start', 'iniciar', 'comecar', 'começar'];

function isGreeting(text: string): boolean {
  return GREETING_TRIGGERS.includes(text.toLowerCase().trim());
}

function extractPhone(from: string): string {
  return from.replace(/@[^@]+$/, '');
}

function isValidChat(from: string): boolean {
  if (from === 'status@broadcast') return false;
  if (from.endsWith('@g.us')) return false;
  return true;
}

async function send(chatId: string, text: string): Promise<void> {
  if (!client || !clientReady) return;
  try {
    await client.sendMessage(chatId, text);
  } catch (err) {
    logger.error({ err, chatId }, 'Failed to send message');
  }
}

async function handleTimeout(phoneNumber: string): Promise<void> {
  const session = getSession(phoneNumber);
  if (!session || session.state === 'ended') return;

  logger.info({ phoneNumber }, 'Session timed out');
  const chatId = session.chatId;
  endSession(phoneNumber);

  try {
    if (client && clientReady) {
      await client.sendMessage(chatId, botMessages.system.timeout.message);
    }
  } catch (err) {
    logger.error({ err, phoneNumber }, 'Failed to send timeout message');
  }
}

async function processMessage(msg: WhatsAppMessage): Promise<void> {
  if (!client || !clientReady) return;
  if (!isValidChat(msg.from)) return;

  const phone = extractPhone(msg.from);
  const body = msg.body?.trim() ?? '';

  if (!body) return;

  logger.info({ phone, body: body.slice(0, 80) }, 'Processing message');

  const chatId = msg.from;

  let session = getSession(phone);

  if (!session) {
    if (!isGreeting(body)) {
      await send(chatId, botMessages.system.session_ended_message);
      return;
    }

    session = createSession(phone, chatId);
    const contact = await msg.getContact();
    const name = contact.pushname || contact.name || 'cliente';
    const welcomeMsg = getMessage('welcome', { name });
    await send(chatId, welcomeMsg);
    await send(chatId, botMessages.main_menu.message);
    setSessionTimeout(phone, handleTimeout);
    return;
  }

  updateSession(phone, { lastActivityAt: new Date() });
  setSessionTimeout(phone, handleTimeout);

  if (session.state === 'ended') {
    endSession(phone);
    createSession(phone, chatId);
    await send(chatId, botMessages.main_menu.message);
    return;
  }

  if (session.state === 'transferred') {
    return;
  }

  if (session.state === 'awaiting_evaluation') {
    const rating = parseInt(body, 10);
    let evalResponse: string;

    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
      evalResponse = getEvaluationResponse(rating);
    } else {
      evalResponse = botMessages.system.evaluation_responses.medium_rating;
    }

    endSession(phone);
    await send(chatId, evalResponse);
    return;
  }

  if (session.state === 'awaiting_followup') {
    const followupOptions = botMessages.system.followup_menu.options;
    const choice = followupOptions[body];

    if (choice === 'main_menu') {
      updateSession(phone, { state: 'main_menu' });
      await send(chatId, botMessages.main_menu.message);
    } else if (choice === 'end_session') {
      await send(chatId, botMessages.system.evaluation_message);
      updateSession(phone, { state: 'awaiting_evaluation' });
    } else {
      await send(chatId, botMessages.system.invalid_option.message);
      await send(chatId, botMessages.system.followup_menu.message);
    }
    return;
  }

  if (session.state === 'main_menu') {
    const menuOptions = getMenuOptions();

    let selectedKey: string | undefined;

    if (menuOptions[body]) {
      selectedKey = menuOptions[body];
    } else {
      const lowerBody = body.toLowerCase();
      if (lowerBody.includes('falar') && lowerBody.includes('atendente')) {
        selectedKey = 'attendant_transfer';
      } else if (lowerBody.includes('finalizar') || lowerBody.includes('encerrar')) {
        selectedKey = 'end_session';
      } else if (lowerBody.includes('fonicorp')) {
        selectedKey = 'fonicorp';
      } else if (lowerBody.includes('isound') || lowerBody.includes('i sound')) {
        selectedKey = 'isound';
      } else if (lowerBody.includes('sonora')) {
        selectedKey = 'sonora';
      }
    }

    if (!selectedKey) {
      await send(chatId, botMessages.system.invalid_option.message);
      await send(chatId, botMessages.main_menu.message);
      return;
    }

    const response = botMessages.responses[selectedKey];
    if (!response) {
      await send(chatId, botMessages.system.error_message);
      await send(chatId, botMessages.main_menu.message);
      return;
    }

    await send(chatId, response.message);

    const action = getResponseAction(selectedKey);

    if (action === 'transfer_to_human') {
      updateSession(phone, { state: 'transferred' });
      logger.info({ phone }, 'User transferred to human agent');
      return;
    }

    if (action === 'close') {
      await send(chatId, botMessages.system.evaluation_message);
      updateSession(phone, { state: 'awaiting_evaluation' });
      return;
    }

    await send(chatId, botMessages.system.followup_menu.message);
    updateSession(phone, { state: 'awaiting_followup' });

    return;
  }

  await send(chatId, botMessages.main_menu.message);
  updateSession(phone, { state: 'main_menu' });
}

const RETRY_DELAY_MS = 30_000;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleRetry(): void {
  if (retryTimeout) return;
  logger.info({ delayMs: RETRY_DELAY_MS }, 'Scheduling WhatsApp bot re-initialization...');
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    initWhatsAppBot();
  }, RETRY_DELAY_MS);
}

function clearChromiumLocks(): void {
  const profileDir = join(process.cwd(), '.wwebjs_auth', 'session');
  for (const lockFile of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    const filePath = join(profileDir, lockFile);
    if (existsSync(filePath)) {
      try {
        rmSync(filePath, { force: true });
        logger.info({ filePath }, 'Removed stale Chromium lock file');
      } catch (err) {
        logger.warn({ err, filePath }, 'Could not remove Chromium lock file');
      }
    }
  }
}

export function initWhatsAppBot(): void {
  logger.info('Initializing WhatsApp bot...');

  clientReady = false;
  client = null;

  clearChromiumLocks();

  const executablePath = process.env['CHROME_EXECUTABLE'] || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';

  const newClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth',
    }),
    puppeteer: {
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    },
  });

  newClient.on('qr', (qr) => {
    qrCodeData = qr as string;
    logger.info('QR Code generated. Scan it with WhatsApp to authenticate.');
    qrcode.generate(qr as string, { small: true });
  });

  newClient.on('ready', () => {
    clientReady = true;
    qrCodeData = null;
    initializationError = null;
    logger.info('WhatsApp bot is ready!');
  });

  newClient.on('authenticated', () => {
    logger.info('WhatsApp bot authenticated successfully');
  });

  newClient.on('auth_failure', (msg) => {
    initializationError = String(msg);
    clientReady = false;
    logger.error({ msg }, 'WhatsApp authentication failure');
    scheduleRetry();
  });

  newClient.on('disconnected', (reason) => {
    clientReady = false;
    logger.warn({ reason }, 'WhatsApp bot disconnected — will retry');
    scheduleRetry();
  });

  newClient.on('message', async (msg) => {
    const message = msg as WhatsAppMessage;
    if (message.fromMe) return;

    try {
      await processMessage(message);
    } catch (err) {
      logger.error({ err, from: message.from }, 'Error processing WhatsApp message');
    }
  });

  client = newClient;

  newClient.initialize().catch((err: unknown) => {
    initializationError = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Failed to initialize WhatsApp client — will retry');
    scheduleRetry();
  });
}

export async function sendMessage(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!client || !clientReady) {
    return { success: false, error: 'WhatsApp client is not ready' };
  }

  try {
    const phone = to.replace(/\D/g, '');
    const chatId = `${phone}@c.us`;
    await client.sendMessage(chatId, message);
    logger.info({ to }, 'Message sent via API');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, to }, 'Failed to send message');
    return { success: false, error: errorMsg };
  }
}

export async function disconnectBot(): Promise<void> {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  clientReady = false;
  qrCodeData = null;
  initializationError = null;
  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      logger.warn({ err }, 'Error destroying WhatsApp client during disconnect');
    }
    client = null;
  }
  clearChromiumLocks();
  logger.info('WhatsApp bot disconnected by user request');
}

export function getBotStatus(): {
  ready: boolean;
  qrCode: string | null;
  error: string | null;
} {
  return {
    ready: clientReady,
    qrCode: qrCodeData,
    error: initializationError,
  };
}
