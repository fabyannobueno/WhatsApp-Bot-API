import app from "./app";
import { logger } from "./lib/logger";
import { initWhatsAppBot } from "./whatsapp/bot";

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — server will continue running');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection — server will continue running');
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  initWhatsAppBot();

  const PING_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    fetch(`http://localhost:${port}/api/whatsapp/status`)
      .then(() => logger.info("Keep-alive ping OK"))
      .catch((err) => logger.warn({ err }, "Keep-alive ping failed"));
  }, PING_INTERVAL_MS);
});
