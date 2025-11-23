import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/my_db';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TOKEN_SECRET = process.env.ADMIN_SECRET || 'dev_secret';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// ------------------------------------------
// POSTGRES SETUP
// ------------------------------------------

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Error en consulta SQL:', err.message, '\nSQL:', text);
    throw err;
  }
};

// ------------------------------------------
// UTILITIES
// ------------------------------------------

const generateId = () => crypto.randomUUID();
const generateToken = () => crypto.randomBytes(16).toString('hex');

const signAuthToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyAuthToken = (token) => {
  try {
    const [headerB64, bodyB64, sig] = token.split('.');
    if (!headerB64 || !bodyB64 || !sig) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${headerB64}.${bodyB64}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

const authGuard = (req, res, next) => {
  if (req.path.startsWith('/public') || req.path === '/health' || req.path === '/login') {
    return next();
  }
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

const saveBase64Image = (dataUrl, memberId) => {
  try {
    const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return null;
    const ext = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${memberId}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error('Error saving image', err);
    return null;
  }
};

// ------------------------------------------
// DATABASE SCHEMA & HELPERS
// ------------------------------------------

const initDb = async () => {
  await query(`
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          role TEXT NOT NULL,
          joinDate DATE NOT NULL,
          bloodType TEXT,
          curp TEXT,
          emergencyContact TEXT,
          photoUrl TEXT,
          status TEXT NOT NULL,
          postalCode TEXT,
          street TEXT,
          houseNumber TEXT,
          colony TEXT,
          city TEXT
        )
    `);

  await query(`
        CREATE TABLE IF NOT EXISTS credentials (
          id TEXT PRIMARY KEY,
          memberId TEXT NOT NULL,
          token TEXT NOT NULL,
          issueDate DATE NOT NULL,
          expirationDate DATE NOT NULL,
          status TEXT NOT NULL,
          FOREIGN KEY(memberId) REFERENCES members(id) ON DELETE CASCADE
        )
    `);
};

const seedIfEmpty = async () => {
  const res = await query('SELECT COUNT(*) as count FROM members');
  const count = parseInt(res.rows[0].count);
  if (count > 0) return;

  const demoMembers = [
    // --- MIEMBROS ANTERIORES (MANTENIDO) ---
    { id: generateId(), firstName: 'Candelario', lastName: 'Aparicio Aguilar', role: 'Vocal', joinDate: '2025-11-23', bloodType: '', curp: 'AAAC620202HMNPGN09', postalCode: '58116', photoUrl: 'https://picsum.photos/200/200?random=3', status: 'ACTIVE', emergencyContact: '443-000-0001', street: 'Priv. de Pejo', houseNumber: 'Mnz 58 Lt 9', colony: 'Presa de los Reyes', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2024-11-08', expirationDate: '2030-11-08', status: 'ACTIVE' }] },
    { id: generateId(), firstName: 'Ramiro', lastName: 'Ibarra Garcia', role: 'Vocal', joinDate: '2025-11-23', bloodType: '', curp: 'IAGR770611HMNBRM05', postalCode: '58115', photoUrl: 'https://picsum.photos/200/200?random=4', status: 'ACTIVE', emergencyContact: '443-000-0002', street: 'Valle de Bravo', houseNumber: 'Mz 39 L19', colony: 'Valle de los Reyes', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2024-11-08', expirationDate: '2030-11-08', status: 'ACTIVE' }] },
    { id: generateId(), firstName: 'Canuto', lastName: 'Valdovinos Saucedo', role: 'Vicepresidente', joinDate: '2025-11-23', bloodType: 'O+', curp: 'VASC510119HGRLCN15', postalCode: '58148', photoUrl: 'https://picsum.photos/200/200?random=5', status: 'ACTIVE', emergencyContact: '443-000-0003', street: 'Jose del Rio', houseNumber: '208', colony: 'Jose Maria Morelos', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2024-11-08', expirationDate: '2030-11-08', status: 'ACTIVE' }] },
    { id: generateId(), firstName: 'Jose Luis', lastName: 'Roman Torres', role: 'Presidente', joinDate: '2025-11-23', bloodType: 'O+', curp: 'ROTL680923HMNMRS13', postalCode: '58148', photoUrl: 'https://picsum.photos/200/200?random=6', status: 'ACTIVE', emergencyContact: '443-476-7856', street: 'Mariano Torres Aranda', houseNumber: '114', colony: 'Jose Maria Morelos', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2024-11-08', expirationDate: '2030-11-08', status: 'ACTIVE' }] },
    { id: generateId(), firstName: 'Cornelio', lastName: 'Garcia Sanchez', role: 'Vocal', joinDate: '2021-02-20', bloodType: 'O+', curp: 'GASC530915HMNRNR01', postalCode: '58116', photoUrl: 'https://picsum.photos/200/200?random=7', status: 'ACTIVE', emergencyContact: '443-000-0005', street: 'Valle de Bravo', houseNumber: 'Mz 39 Lt 19', colony: 'Presa de los Reyes', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2023-11-08', expirationDate: '2025-11-08', status: 'ACTIVE' }] },
    { id: generateId(), firstName: 'Luis Angel', lastName: 'Roman Valdovinos', role: 'Vocal', joinDate: '2024-01-15', bloodType: '', curp: 'ROVL960121HMNMLS01', postalCode: '58148', photoUrl: 'https://picsum.photos/200/200?random=8', status: 'ACTIVE', emergencyContact: '443-000-0006', street: 'Mariano Torres Aranda', houseNumber: '114', colony: 'Jose Maria Morelos', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2024-11-08', expirationDate: '2030-11-08', status: 'ACTIVE' }] },
    { id: generateId(), firstName: 'Nelida', lastName: 'Valdovinos Campos', role: 'Vocal', joinDate: '2024-01-15', bloodType: 'O+', curp: 'VACN810404MMNLML08', postalCode: '58148', photoUrl: 'https://picsum.photos/200/200?random=9', status: 'ACTIVE', emergencyContact: '443-000-0007', street: 'Jose del Rio', houseNumber: '208', colony: 'Jose Maria Morelos', city: 'Morelia, Michoacán', credentials: [{ id: generateId(), token: generateToken(), issueDate: '2024-11-08', expirationDate: '2030-11-08', status: 'ACTIVE' }] }
  ];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const memberInserts = demoMembers.map(async (m) => {
      await client.query(`
                INSERT INTO members (id, firstName, lastName, role, joinDate, bloodType, curp, emergencyContact, photoUrl, status, street, houseNumber, colony, city, postalCode)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [m.id, m.firstName, m.lastName, m.role, m.joinDate, m.bloodType, m.curp, m.emergencyContact, m.photoUrl, m.status, m.street, m.houseNumber, m.colony, m.city, m.postalCode]);

      const credInserts = m.credentials.map((c) => {
        return client.query(`
                    INSERT INTO credentials (id, memberId, token, issueDate, expirationDate, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [c.id, m.id, c.token, c.issueDate, c.expirationDate, c.status]);
      });
      await Promise.all(credInserts);
    });

    await Promise.all(memberInserts);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error al sembrar la base de datos:', e);
  } finally {
    client.release();
  }
};

const attachCredentials = async (members) => {
  if (members.length === 0) return members;
  const ids = members.map((m) => m.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

  const res = await query(`
        SELECT * FROM credentials 
        WHERE memberId IN (${placeholders}) 
        ORDER BY issueDate DESC
    `, ids);

  const credentials = res.rows;
  const byMember = credentials.reduce((acc, cred) => {
    // La propiedad de JS es la que retorna el driver de pg, que será camelCase o minúscula
    acc[cred.memberId] = acc[cred.memberId] || [];
    acc[cred.memberId].push(cred);
    return acc;
  }, {});

  return members.map((m) => ({
    ...m,
    credentials: byMember[m.id] || []
  }));
};

const findMemberWithCreds = async (id) => {
  const memberRes = await query('SELECT * FROM members WHERE id = $1', [id]);
  const member = memberRes.rows[0];
  if (!member) return null;

  // CORREGIDO: Removidas comillas de memberId y issueDate
  const credsRes = await query('SELECT * FROM credentials WHERE memberId = $1 ORDER BY issueDate DESC', [id]);

  return { ...member, credentials: credsRes.rows };
};


// ------------------------------------------
// APP INITIALIZATION & ROUTES
// ------------------------------------------

// Iniciar la base de datos de forma asíncrona
(async () => {
  try {
    await initDb();
    ensureUploadDir();
    await seedIfEmpty();
    app.use('/api', authGuard);

    app.listen(PORT, () => {
      console.log(`API escuchando en http://localhost:${PORT}`);
    });

  } catch (e) {
    console.error('Error al inicializar la aplicación:', e);
    process.exit(1);
  }
})();


app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).send('Credenciales incorrectas');
  }
  const token = signAuthToken({
    sub: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
  res.json({ token });
});

app.get('/api/members', async (_req, res) => {
  const membersRes = await query('SELECT * FROM members');
  res.json(await attachCredentials(membersRes.rows));
});

app.get('/api/members/:id', async (req, res) => {
  const member = await findMemberWithCreds(req.params.id);
  if (!member) {
    return res.status(404).send('Not found');
  }
  res.json(member);
});

app.post('/api/members', async (req, res) => {
  const body = req.body;
  if (!body.firstName || !body.lastName || !body.role) {
    return res.status(400).send('Campos requeridos faltantes');
  }

  const memberId = body.id || generateId();
  let photoUrl = body.photoUrl || '';
  if (photoUrl?.startsWith('data:image')) {
    const savedPath = saveBase64Image(photoUrl, memberId);
    if (savedPath) photoUrl = savedPath;
  }

  const credentials = Array.isArray(body.credentials) && body.credentials.length > 0
    ? body.credentials
    : [{
      id: generateId(),
      token: generateToken(),
      issueDate: new Date().toISOString().split('T')[0],
      expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      status: 'ACTIVE'
    }];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
            INSERT INTO members (id, firstName, lastName, role, joinDate, bloodType, curp, emergencyContact, photoUrl, status, postalCode, street, houseNumber, colony, city)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
      memberId, body.firstName, body.lastName, body.role, body.joinDate || new Date().toISOString().split('T')[0],
      body.bloodType || null, body.curp || null, body.emergencyContact || null, photoUrl,
      body.status || 'ACTIVE', body.postalCode || null, body.street || null,
      body.houseNumber || null, body.colony || null, body.city || null
    ]);

    const credInserts = credentials.map((cred) => {
      return client.query(`
                INSERT INTO credentials (id, memberId, token, issueDate, expirationDate, status)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
        cred.id || generateId(), memberId, cred.token || generateToken(),
        cred.issueDate || new Date().toISOString().split('T')[0], cred.expirationDate,
        cred.status || 'ACTIVE'
      ]);
    });

    await Promise.all(credInserts);

    await client.query('COMMIT');

    const saved = await findMemberWithCreds(memberId);
    res.status(201).json(saved);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Error creating member');
  } finally {
    client.release();
  }
});

app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const current = await findMemberWithCreds(id);
  if (!current) return res.status(404).send('Not found');

  let photoUrl = body.photoUrl ?? current.photoUrl ?? '';
  if (photoUrl?.startsWith('data:image')) {
    const savedPath = saveBase64Image(photoUrl, id);
    if (savedPath) photoUrl = savedPath;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
            UPDATE members SET 
                firstName=$1,lastName=$2,role=$3,joinDate=$4,bloodType=$5,curp=$6,postalCode=$7,
                emergencyContact=$8,photoUrl=$9,status=$10,street=$11,houseNumber=$12,
                colony=$13,city=$14
            WHERE id=$15
        `, [
      body.firstName, body.lastName, body.role, body.joinDate || current.joinDate,
      body.bloodType || null, body.curp || null, body.postalCode || null,
      body.emergencyContact || null, photoUrl, body.status || 'ACTIVE',
      body.street || null, body.houseNumber || null, body.colony || null,
      body.city || null, id
    ]);

    await client.query('DELETE FROM credentials WHERE memberId = $1', [id]);

    const credInserts = (body.credentials || []).map((cred) => {
      return client.query(`
                INSERT INTO credentials (id, memberId, token, issueDate, expirationDate, status)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
        cred.id || generateId(), id, cred.token || generateToken(),
        cred.issueDate || new Date().toISOString().split('T')[0], cred.expirationDate,
        cred.status || 'ACTIVE'
      ]);
    });

    await Promise.all(credInserts);

    await client.query('COMMIT');

    res.json(await findMemberWithCreds(id));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Error updating member');
  } finally {
    client.release();
  }
});

app.delete('/api/members/:id', async (req, res) => {
  const resDelete = await query('DELETE FROM members WHERE id = $1', [req.params.id]);
  if (resDelete.rowCount === 0) return res.status(404).send('Not found');
  res.status(204).send();
});

// Public endpoint for QR validation
app.get('/api/public/members/:id', async (req, res) => {
  const member = await findMemberWithCreds(req.params.id);
  if (!member) {
    return res.status(404).json({ member: null, credential: null, errorType: 'NOT_FOUND' });
  }

  const token = req.query.token;
  if (!token) {
    return res.json({ member, credential: null, errorType: 'INVALID_QR' });
  }

  const credential = member.credentials.find((c) => c.token === token) || null;
  if (!credential) {
    return res.json({ member, credential: null, errorType: 'INVALID_QR' });
  }

  return res.json({ member, credential, errorType: null });
});