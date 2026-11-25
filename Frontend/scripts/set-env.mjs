import { writeFileSync, mkdirSync } from 'node:fs';


const apiUrl = (process.env.API_URL || '/api/v1').replace(/\/$/, '');
if (!apiUrl.startsWith('/') && !apiUrl.startsWith('https://')) {
    throw new Error('API_URL must be a relative path or an HTTPS API origin with /api/v1.');
}
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
mkdirSync('src/app/environments', { recursive: true });
writeFileSync(
    'src/app/environments/environment.prod.ts',
    'export const environment = ' +
    JSON.stringify({ production: true, apiUrl, googleClientId }, null, 2) +
    ';\n',
);
// Runtime config is copied from public by Angular and is the source of truth at startup.
writeFileSync('public/config.json', JSON.stringify({ apiBaseUrl: apiUrl }, null, 2) + '\n');
