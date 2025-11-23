import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
// 👉 SUPABASE CHANGE: Reemplazar pg por @supabase/supabase-js
import { createClient } from '@supabase/supabase-js'; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;

// 👉 SUPABASE CHANGE: Usar URL y Clave de Servicio de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // ¡Usar clave de rol de servicio!

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TOKEN_SECRET = process.env.ADMIN_SECRET || 'dev_secret';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// ------------------------------------------
// SUPABASE SETUP
// ------------------------------------------

// Inicializar el cliente de Supabase (Admin/Service Role)
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY. Terminando proceso.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ------------------------------------------
// UTILITIES (JWT, Files, AuthGuard - NO CAMBIA)
// ------------------------------------------

// ... (El código de generateId, generateToken, signAuthToken, verifyAuthToken, 
// ensureUploadDir, authGuard, saveBase64Image es idéntico al que tenías) ...

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
// DATABASE HELPERS (Usando Supabase REST API)
// ------------------------------------------

// ❌ initDb y seedIfEmpty han sido eliminados. El esquema debe existir en Supabase.
// Es muy importante que la tabla "members" y "credentials" ya existan en Supabase 
// con las columnas en camelCase (firstName, joinDate, etc.) si quieres que el front funcione.

// 👉 SUPABASE CHANGE: Función para buscar credenciales (SELECT con JOIN implícito)
const attachCredentials = async (members) => {
    if (members.length === 0) return members;
    const ids = members.map((m) => m.id);

    // Consulta las credenciales para todos los miembros de una vez
    const { data: credentials, error: credError } = await supabase
        .from('credentials')
        .select('*')
        .in('memberId', ids)
        .order('issueDate', { ascending: false });

    if (credError) throw credError;

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

// 👉 SUPABASE CHANGE: Función para buscar miembro y credenciales (SELECT)
const findMemberWithCreds = async (id) => {
    // 1. Obtener el miembro
    const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single(); // Esperamos un solo resultado

    if (memberError && memberError.code !== 'PGRST116') throw memberError; // PGRST116 = No Rows
    if (!memberData) return null;

    // 2. Obtener las credenciales
    const { data: credentials, error: credError } = await supabase
        .from('credentials')
        .select('*')
        .eq('memberId', id)
        .order('issueDate', { ascending: false });

    if (credError) throw credError;
    
    return { ...memberData, credentials };
};


// ------------------------------------------
// APP INITIALIZATION & ROUTES
// ------------------------------------------

// Solo iniciamos Express, ya no necesitamos initDb/seedIfEmpty
(async () => {
    try {
        ensureUploadDir();
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
    // 👉 SUPABASE CHANGE: Health check para el cliente Supabase
    try {
        const { error } = await supabase.from('members').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', db: 'connected' });
    } catch (e) {
        res.status(500).json({ status: 'error', db: 'disconnected', details: e.message });
    }
});

app.post('/api/login', (req, res) => {
    // No cambia
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
    // 👉 SUPABASE CHANGE: SELECT *
    const { data: members, error } = await supabase
        .from('members')
        .select('*');

    if (error) return res.status(500).json({ error: 'Error fetching members', details: error.message });

    res.json(await attachCredentials(members));
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
    
    // 👉 SUPABASE CHANGE: Manejo de transacciones manual con dos INSERT (ya que supabase-js no tiene un tx() fácil)
    try {
        // 1. Insertar Miembro
        const memberData = {
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
        };
        
        const { error: memberError } = await supabase
            .from('members')
            .insert(memberData);

        if (memberError) throw memberError;

        // 2. Insertar Credenciales
        const credsToInsert = credentials.map((cred) => ({
            id: cred.id || generateId(),
            memberId,
            token: cred.token || generateToken(),
            issueDate: cred.issueDate || new Date().toISOString().split('T')[0],
            expirationDate: cred.expirationDate,
            status: cred.status || 'ACTIVE'
        }));

        const { error: credError } = await supabase
            .from('credentials')
            .insert(credsToInsert);
        
        if (credError) throw credError;
        
        const saved = await findMemberWithCreds(memberId);
        res.status(201).json(saved);

    } catch (err) {
        console.error('Error creating member (Supabase):', err.message);
        // NOTA: No podemos hacer ROLLBACK fácil, tendrías que borrar el registro manualmente si el segundo insert falla.
        res.status(500).send('Error creating member');
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
    
    // 👉 SUPABASE CHANGE: Update y manejo de credenciales
    try {
        // 1. Actualizar Miembro
        const memberUpdateData = {
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
        };
        
        const { error: memberError } = await supabase
            .from('members')
            .update(memberUpdateData)
            .eq('id', id);

        if (memberError) throw memberError;

        // 2. Eliminar credenciales antiguas (simulando DELETE FROM... y recreando)
        await supabase
            .from('credentials')
            .delete()
            .eq('memberId', id);

        // 3. Insertar nuevas credenciales
        const credsToInsert = (body.credentials || []).map((cred) => ({
            id: cred.id || generateId(),
            memberId: id,
            token: cred.token || generateToken(),
            issueDate: cred.issueDate || new Date().toISOString().split('T')[0],
            expirationDate: cred.expirationDate,
            status: cred.status || 'ACTIVE'
        }));

        const { error: credError } = await supabase
            .from('credentials')
            .insert(credsToInsert);
        
        if (credError) throw credError;

        res.json(await findMemberWithCreds(id));
        
    } catch (err) {
        console.error('Error updating member (Supabase):', err);
        res.status(500).send('Error updating member');
    }
});

app.delete('/api/members/:id', async (req, res) => {
    // 👉 SUPABASE CHANGE: DELETE
    const { id } = req.params;
    const { count, error } = await supabase
        .from('members')
        .delete({ count: 'exact' }) // Pide el conteo de filas afectadas
        .eq('id', id);

    if (error) {
        console.error('Error deleting member (Supabase):', error);
        return res.status(500).send('Error deleting member');
    }
    
    // Supabase retorna 'count' (o null) en lugar de rowCount/changes
    if (count === 0) return res.status(404).send('Not found');
    
    // La FK en credentials debe encargarse de borrar en cascada
    res.status(204).send();
});

// Public endpoint for QR validation (NO CAMBIA MUCHO porque usa findMemberWithCreds)
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