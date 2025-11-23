import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Database from 'better-sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TOKEN_SECRET = process.env.ADMIN_SECRET || 'dev_secret';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const ensureDbDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDbDir();

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

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

const ensureCurpColumn = () => {
  const columns = db.prepare("PRAGMA table_info(members)").all();
  const hasCurp = columns.some((c) => c.name === 'curp');
  const hasPostalCode = columns.some((c) => c.name === 'postalCode');
  if (!hasCurp) {
    try {
      db.prepare("ALTER TABLE members ADD COLUMN curp TEXT").run();
    } catch (err) {
      console.error('No se pudo agregar columna curp:', err);
    }
  }
  if (!hasPostalCode) {
    try {
      db.prepare("ALTER TABLE members ADD COLUMN postalCode TEXT").run();
    } catch (err) {
      console.error('No se pudo agregar columna postalCode:', err);
    }
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

const initDb = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL,
      joinDate TEXT NOT NULL,
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
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      token TEXT NOT NULL,
      issueDate TEXT NOT NULL,
      expirationDate TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(memberId) REFERENCES members(id) ON DELETE CASCADE
    )
  `).run();
};

const seedIfEmpty = () => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM members').get();
  if (count > 0) return;

  const tx = db.transaction(() => {
    const memberStmt = db.prepare(`
      INSERT INTO members (id, firstName, lastName, role, joinDate, bloodType, curp, emergencyContact, photoUrl, status, street, houseNumber, colony, city)
      VALUES (@id, @firstName, @lastName, @role, @joinDate, @bloodType, @curp, @emergencyContact, @photoUrl, @status, @street, @houseNumber, @colony, @city)
    `);
    const credentialStmt = db.prepare(`
      INSERT INTO credentials (id, memberId, token, issueDate, expirationDate, status)
      VALUES (@id, @memberId, @token, @issueDate, @expirationDate, @status)
    `);

    const demoMembers = [
      // --- MIEMBROS ANTERIORES ---
      {
        id: generateId(),
        firstName: 'Candelario',
        lastName: 'Aparicio Aguilar',
        role: 'Vocal',
        joinDate: '2025-23-11',
        bloodType: '',
        curp: 'AAAC620202HMNPGN09',
        postalCode: '58116',
        photoUrl: 'https://picsum.photos/200/200?random=3',
        status: 'ACTIVE',
        emergencyContact: '443-000-0001',
        street: 'Priv. de Pejo',
        houseNumber: 'Mnz 58 Lt 9',
        colony: 'Presa de los Reyes',
        city: 'Morelia, Michoacán',
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2024-11-08',
            expirationDate: '2030-11-08',
            status: 'ACTIVE'
          }
        ]
      },
      {
        id: generateId(),
        firstName: 'Ramiro',
        lastName: 'Ibarra Garcia',
        role: 'Vocal',
        joinDate: '2025-23-11',
        bloodType: '',
        curp: 'IAGR770611HMNBRM05',
        postalCode: '58115',
        photoUrl: 'https://picsum.photos/200/200?random=4',
        status: 'ACTIVE',
        emergencyContact: '443-000-0002',
        street: 'Valle de Bravo',
        houseNumber: 'Mz 39 L19',
        colony: 'Valle de los Reyes',
        city: 'Morelia, Michoacán',
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2024-11-08',
            expirationDate: '2030-11-08',
            status: 'ACTIVE'
          }
        ]
      },
      {
        id: generateId(),
        firstName: 'Canuto',
        lastName: 'Valdovinos Saucedo',
        role: 'Vicepresidente',
        joinDate: '2025-23-11',
        bloodType: 'O+',
        curp: 'VASC510119HGRLCN15',
        postalCode: '58148',
        photoUrl: 'https://picsum.photos/200/200?random=5',
        status: 'ACTIVE',
        emergencyContact: '443-000-0003',
        street: 'Rafael Maria Villagran',
        houseNumber: '208',
        colony: 'Jose Maria Morelos',
        city: 'Morelia, Michoacán',
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2024-11-08',
            expirationDate: '2030-11-08',
            status: 'ACTIVE'
          }
        ]
      },
      {
        id: generateId(),
        firstName: 'Jose Luis',
        lastName: 'Roman Torres',
        role: 'Presidente',
        joinDate: '2025-23-11',
        bloodType: 'O+',
        curp: 'ROTL680923HMNMRS13',
        postalCode: '58148',
        photoUrl: 'https://picsum.photos/200/200?random=6',
        status: 'ACTIVE',
        emergencyContact: '443-476-7856',
        street: 'Mariano Torres Aranda',
        houseNumber: '114',
        colony: 'Jose Maria Morelos',
        city: 'Morelia, Michoacán',
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2024-11-08',
            expirationDate: '2030-11-08',
            status: 'ACTIVE'
          }
        ]
      },
      {
        id: generateId(),
        firstName: 'Cornelio',
        lastName: 'Garcia Sanchez',
        role: 'Vocal',
        joinDate: '2021-02-20',
        bloodType: 'O+',
        curp: 'GASC530915HMNRNR01',
        postalCode: '58116',
        photoUrl: 'https://picsum.photos/200/200?random=7',
        status: 'ACTIVE',
        emergencyContact: '443-000-0005',
        street: 'Valle de Bravo',
        houseNumber: 'Mz 39 Lt 19',
        colony: 'Presa de los Reyes',
        city: 'Morelia, Michoacán',
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2023-11-08',
            expirationDate: '2025-11-08',
            status: 'ACTIVE'
          }
        ]
      },
      {
        id: generateId(),
        firstName: 'Luis Angel',
        lastName: 'Roman Valdovinos',
        role: 'Vocal',
        joinDate: '2024-01-15',
        bloodType: '',
        curp: 'ROVL960121HMNMLS01',
        postalCode: '58148',
        photoUrl: 'https://picsum.photos/200/200?random=8',
        status: 'ACTIVE',
        emergencyContact: '443-000-0006',
        street: 'Mariano Torres Aranda',
        houseNumber: '114',
        colony: 'Jose Maria Morelos',
        city: 'Morelia, Michoacán',
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2024-11-08',
            expirationDate: '2030-11-08',
            status: 'ACTIVE'
          }
        ]
      }, 
      {
        id: generateId(),
        firstName: 'Nelida',
        lastName: 'Valdovinos Campos',
        role: 'Vocal', 
        joinDate: '2024-01-15',
        bloodType: 'O+',  
        curp: 'VACN810404MMNLML08',  
        postalCode: '58148',  
        photoUrl: 'https://picsum.photos/200/200?random=9',
        status: 'ACTIVE',
        emergencyContact: '443-000-0007',
        street: 'Jose del Rio',  
        houseNumber: '208', 
        colony: 'Jose Maria Morelos',  
        city: 'Morelia, Michoacán',  
        credentials: [
          {
            id: generateId(),
            token: generateToken(),
            issueDate: '2024-11-08',  
            expirationDate: '2030-11-08',  
            status: 'ACTIVE'
          }
        ]
      }
    ];

    for (const m of demoMembers) {
      memberStmt.run(m);
      m.credentials.forEach((c) => credentialStmt.run({ ...c, memberId: m.id }));
    }
  });

  tx();
};

const attachCredentials = (members) => {
  if (members.length === 0) return members;
  const ids = members.map((m) => m.id);
  const placeholders = ids.map(() => '?').join(',');
  const credentials = db.prepare(`SELECT * FROM credentials WHERE memberId IN (${placeholders}) ORDER BY issueDate DESC`).all(...ids);
  const byMember = credentials.reduce((acc, cred) => {
    acc[cred.memberId] = acc[cred.memberId] || [];
    acc[cred.memberId].push(cred);
    return acc;
  }, {});

  return members.map((m) => ({
    ...m,
    credentials: byMember[m.id] || []
  }));
};

const findMemberWithCreds = (id) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) return null;
  const credentials = db.prepare('SELECT * FROM credentials WHERE memberId = ? ORDER BY issueDate DESC').all(id);
  return { ...member, credentials };
};

initDb();
ensureCurpColumn();
ensureUploadDir();
seedIfEmpty();
app.use('/api', authGuard);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
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

app.get('/api/members', (_req, res) => {
  const members = db.prepare('SELECT * FROM members').all();
  res.json(attachCredentials(members));
});

app.get('/api/members/:id', (req, res) => {
  const member = findMemberWithCreds(req.params.id);
  if (!member) {
    return res.status(404).send('Not found');
  }
  res.json(member);
});

app.post('/api/members', (req, res) => {
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

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO members (id, firstName, lastName, role, joinDate, bloodType, curp, emergencyContact, photoUrl, status, postalCode, street, houseNumber, colony, city)
      VALUES (@id, @firstName, @lastName, @role, @joinDate, @bloodType, @curp, @emergencyContact, @photoUrl, @status, @postalCode, @street, @houseNumber, @colony, @city)
    `).run({
      id: memberId,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      joinDate: body.joinDate || new Date().toISOString().split('T')[0],
      bloodType: body.bloodType || null,
      curp: body.curp || null,
      emergencyContact: body.emergencyContact || null,
      photoUrl,
      status: body.status || 'ACTIVE',
      postalCode: body.postalCode || null,
      street: body.street || null,
      houseNumber: body.houseNumber || null,
      colony: body.colony || null,
      city: body.city || null
    });

    const credStmt = db.prepare(`
      INSERT INTO credentials (id, memberId, token, issueDate, expirationDate, status)
      VALUES (@id, @memberId, @token, @issueDate, @expirationDate, @status)
    `);

    credentials.forEach((cred) => {
      credStmt.run({
        id: cred.id || generateId(),
        memberId,
        token: cred.token || generateToken(),
        issueDate: cred.issueDate || new Date().toISOString().split('T')[0],
        expirationDate: cred.expirationDate,
        status: cred.status || 'ACTIVE'
      });
    });
  });

  try {
    tx();
    const saved = findMemberWithCreds(memberId);
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating member');
  }
});

app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const current = findMemberWithCreds(id);
  if (!current) return res.status(404).send('Not found');

  let photoUrl = body.photoUrl ?? current.photoUrl ?? '';
  if (photoUrl?.startsWith('data:image')) {
    const savedPath = saveBase64Image(photoUrl, id);
    if (savedPath) photoUrl = savedPath;
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE members SET firstName=@firstName,lastName=@lastName,role=@role,joinDate=@joinDate,bloodType=@bloodType,curp=@curp,postalCode=@postalCode,
      emergencyContact=@emergencyContact,photoUrl=@photoUrl,status=@status,street=@street,houseNumber=@houseNumber,
      colony=@colony,city=@city WHERE id=@id
    `).run({
      id,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      joinDate: body.joinDate || current.joinDate,
      bloodType: body.bloodType || null,
      curp: body.curp || null,
      postalCode: body.postalCode || null,
      emergencyContact: body.emergencyContact || null,
      photoUrl,
      status: body.status || 'ACTIVE',
      street: body.street || null,
      houseNumber: body.houseNumber || null,
      colony: body.colony || null,
      city: body.city || null
    });

    db.prepare('DELETE FROM credentials WHERE memberId = ?').run(id);

    const credStmt = db.prepare(`
      INSERT INTO credentials (id, memberId, token, issueDate, expirationDate, status)
      VALUES (@id, @memberId, @token, @issueDate, @expirationDate, @status)
    `);

    (body.credentials || []).forEach((cred) => {
      credStmt.run({
        id: cred.id || generateId(),
        memberId: id,
        token: cred.token || generateToken(),
        issueDate: cred.issueDate || new Date().toISOString().split('T')[0],
        expirationDate: cred.expirationDate,
        status: cred.status || 'ACTIVE'
      });
    });
  });

  try {
    tx();
    res.json(findMemberWithCreds(id));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating member');
  }
});

app.delete('/api/members/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  if (!changes) return res.status(404).send('Not found');
  res.status(204).send();
});

// Public endpoint for QR validation
app.get('/api/public/members/:id', (req, res) => {
  const member = findMemberWithCreds(req.params.id);
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

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
