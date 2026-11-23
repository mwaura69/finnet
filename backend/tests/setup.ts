// Load before importing the app. Tests never touch the developer's database.
process.env['DATABASE_PATH'] = ':memory:';
process.env['NODE_ENV'] = 'test';
process.env['DEMO_MODE'] = 'true';
process.env['LOG_LEVEL'] = 'silent';
