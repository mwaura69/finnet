import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db/database.js';


const server = createApp().listen(config.port, () => 
    console.log(`FinTrack ${config.demo?'DEMO API':'API scaffold'}: http://localhost:${config.port} | docs: /api/docs`
));

function shutdown(){server.close(()=>
    {db.close();process.exit(0);}
);}

process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
