import { writeFileSync, mkdirSync } from 'node:fs';

const { API_URL, GOOGLE_CLIENT_ID = '' } = process.env;
    if (!API_URL) {
        console.error('API_URL is not set');
        process.exit(1);
    }

    mkdirSync('src/app/environments', { recursive: true });
    writeFileSync(
        'src/app/environments/environment.prod.ts',
        `export const environment = {
    production: true,
    apiUrl: ${JSON.stringify(API_URL)},
    googleClientId: ${JSON.stringify(GOOGLE_CLIENT_ID)},
    };
`,
);
