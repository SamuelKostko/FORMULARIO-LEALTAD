const admin = require("firebase-admin");
const crypto = require("node:crypto");
const { sendActivationEmail } = require("./_lib/email");

const SERVICE_ACCOUNT_ENV_NAMES = [
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_ADMIN_CREDENTIALS",
  "FIREBASE_CREDENTIALS_JSON",
];

const COLLECTION_ENV_NAMES = [
  "FIREBASE_COLLECTION",
  "FIRESTORE_COLLECTION",
  "FORM_COLLECTION",
];

function readEnv(names, fallback = "") {
  for (const name of names) {
    const value = process.env[name];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return fallback;
}

function getCollectionName() {
  return readEnv(COLLECTION_ENV_NAMES, "clientes");
}

function getServiceAccount() {
  const rawValue = readEnv(SERVICE_ACCOUNT_ENV_NAMES);

  if (!rawValue) {
    return null;
  }

  const parsed = JSON.parse(rawValue);

  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed;
}

function getFirestore() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();

    if (!serviceAccount) {
      throw new Error("FIREBASE_CONFIG_MISSING");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

function validatePayload(payload) {
  const requiredFields = ["firstName", "lastName", "idNumber", "email", "phone"];

  for (const field of requiredFields) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      return "Todos los campos son obligatorios.";
    }
  }

  return null;
}

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 8;

function getClientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] ?? '').trim();
  if (xff) return xff.split(',')[0].trim();
  return String(req.headers['x-real-ip'] ?? '').trim() || 'unknown';
}

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function consumeRateLimit(db, ip) {
  const now = Date.now();
  const bucket = Math.floor(now / RATE_WINDOW_MS);
  const key = hashKey(`${ip}:${bucket}`);
  const ref = db.collection('rate_limits').doc(`register:${key}`);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
      if (current >= RATE_MAX_ATTEMPTS) throw new Error('RATE_LIMIT_EXCEEDED');

      tx.set(
        ref,
        {
          count: current + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(now + RATE_WINDOW_MS).toISOString()
        },
        { merge: true }
      );
    });
    return { ok: true };
  } catch (err) {
    if (String(err?.message) === 'RATE_LIMIT_EXCEEDED') {
      return { ok: false, error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' };
    }
    throw err;
  }
}

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "Método no permitido." });
  }

  try {
    const payload = request.body ?? {};
    const validationError = validatePayload(payload);

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const db = getFirestore();
    const collectionName = getCollectionName(); // clientes

    // 1. Rate Limit
    const ip = getClientIp(request);
    const rl = await consumeRateLimit(db, ip);
    if (!rl.ok) {
      return response.status(429).json({ message: rl.error });
    }

    const email = payload.email.trim().toLowerCase();
    const idNumber = payload.idNumber.replace(/\D/g, "");
    const name = `${payload.firstName.trim()} ${payload.lastName.trim()}`;

    // 2. Avoid duplicates
    // Revisar si ya existe el correo en 'customers' (clientes)
    const customerRef = db.collection(collectionName).doc(email);
    const existingCustomer = await customerRef.get();
    if (existingCustomer.exists) {
      return response.status(409).json({ message: 'Este email ya tiene una tarjeta registrada.' });
    }

    // Revisar si ya existe la cédula
    const cedulaDup = await db.collection(collectionName).where('idNumber', '==', idNumber).limit(1).get();
    if (!cedulaDup.empty) {
      return response.status(409).json({ message: 'Esta cédula ya está registrada.' });
    }

    const token = makeToken();
    const nowIso = new Date().toISOString();

    const cardRef = db.collection('cards').doc(token);
    const txRef = db.collection('transactions').doc(crypto.randomBytes(12).toString('base64url'));

    // Generar enlace público para la tarjeta
    // Nota: Asume que se despliega en un entorno como Vercel donde VERCEL_URL está disponible
    const protocol = request.headers["x-forwarded-proto"] || "http";
    const host = request.headers["host"] || process.env.VERCEL_URL || "localhost:3000";
    const linkPath = `/card/${token}`;
    const publicLink = `${protocol}://${host}${linkPath}`;

    // Usar transaction/batch para guardar todo atómicamente
    const batch = db.batch();
    
    // El cliente (antes db.collection(collectionName).add...)
    batch.set(customerRef, {
      nombre: name,
      idNumber: idNumber,
      email: email,
      phone: payload.phone.trim(),
      token: token,
      updatedAt: nowIso,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // La tarjeta
    batch.set(cardRef, { 
      name, 
      cedula: idNumber, 
      balance: 0, 
      customerEmail: email,
      updatedAt: nowIso 
    }, { merge: true });

    // La transacción inicial
    batch.set(txRef, {
      type: 'initial_balance',
      status: 'success',
      token,
      points: 0,
      description: 'Saldo inicial',
      balanceBefore: 0,
      balanceAfter: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Intentar enviar el correo de activación
    try {
      await sendActivationEmail({ 
        to: email, 
        name: name, 
        link: publicLink 
      });
    } catch (emailError) {
      console.error("Error al enviar el correo de activación:", emailError);
      // No bloqueamos la respuesta al cliente si el correo falla
    }

    return response.status(200).json({ ok: true, token, cardLink: publicLink });
  } catch (error) {
    console.error(error);

    if (error.message === "FIREBASE_CONFIG_MISSING") {
      return response.status(503).json({ message: "FIREBASE_CONFIG_MISSING" });
    }

    if (error instanceof SyntaxError) {
      return response.status(500).json({ message: "El JSON de Firebase en variables de entorno no es válido." });
    }

    return response.status(500).json({ message: "No se pudo guardar la información en Firebase." });
  }
};