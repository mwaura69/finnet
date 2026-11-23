import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './database.js';
const email = process.env['DEMO_EMAIL'] || 'demo@fintrack.local';
if (!db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
  const user = randomUUID();
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)').run(user, 'Alex Morgan', email, bcrypt.hashSync(process.env['DEMO_PASSWORD'] || 'FinTrackDemo!2026', 12));
    const insert = db.prepare('INSERT INTO portfolios(id,user_id,name,client_name,base_currency,created_at) VALUES(?,?,?,?,?,?)');
    insert.run('p-growth', user, 'East Africa Growth', 'Amani Capital', 'KES', '2026-08-12T08:00:00Z');
    insert.run('p-income', user, 'Steady Income', 'Mawingu Family Trust', 'KES', '2026-09-04T08:00:00Z');
    insert.run('p-global', user, 'Global Opportunities', 'Horizon Ventures', 'USD', '2026-10-15T08:00:00Z');
    const tx = db.prepare('INSERT INTO transactions(id,portfolio_id,instrument,type,quantity,unit_price_minor,trade_date,created_at) VALUES(?,?,?,?,?,?,?,?)');
    const rows: [string,string,string,number,number,string][] = [
      ['p-growth','SCOM','BUY',20000,2650,'2026-09-02'],['p-growth','KCB','BUY',10000,4200,'2026-09-10'],
      ['p-growth','EQTY','BUY',8000,4850,'2026-09-18'],['p-growth','T-BILL-91','BUY',500,100000,'2026-10-01'],
      ['p-growth','SCOM','BUY',5000,2800,'2026-10-12'],['p-growth','KCB','SELL',1500,4650,'2026-11-05'],
      ['p-growth','SCOM','SELL',2000,2950,'2026-11-12'],['p-growth','EQTY','BUY',1000,5100,'2026-11-18'],
      ['p-income','T-BILL-91','BUY',1500,100000,'2026-10-05'],['p-income','KCB','BUY',2500,4400,'2026-11-02'],
      ['p-global','VOO','BUY',30,51000,'2026-10-20'],['p-global','MSFT','BUY',20,42000,'2026-11-10'],
    ];
    rows.forEach((r,i) => tx.run(randomUUID(), ...r, `2026-11-20T08:00:${String(i).padStart(2,'0')}Z`));
    db.exec('COMMIT');
    console.log('Schema and fictional demo data ready. Login:', email);
  } catch (error) { db.exec('ROLLBACK'); throw error; }
} else console.log('Schema ready; existing demo account preserved.');
db.close();
