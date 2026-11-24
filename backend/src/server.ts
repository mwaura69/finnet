import { createApp } from './app.js';
import { config } from './config/index.js';
import { startNotificationWorker } from './api/v1/services.js';
import { db } from './db/index.js';
import { seedDemo } from './db/seeds/demo.js';
import { logger } from './config/logger.js';

if (config.demoAccount.enabled) {
  const result = seedDemo(db, config.demoAccount);
  logger.info({ created: result.created }, 'Demo account initialization completed');
  if (!result.passwordMatches)
    logger.warn(
      'Existing demo password differs from DEMO_PASSWORD; existing credentials were preserved.',
    );
}

const stopNotifications = startNotificationWorker();
const server = createApp().listen(config.port, () =>
  console.log(
    `FinTrack ${config.demo ? 'DEMO API' : 'API scaffold'}: http://localhost:${config.port} | docs: /api/v1/docs`,
  ),
);

function shutdown() {
  server.close(() => {
    stopNotifications();
    db.close();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
