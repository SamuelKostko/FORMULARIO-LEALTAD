const admin = require("firebase-admin");

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
  return readEnv(COLLECTION_ENV_NAMES, "formularios_lealtad");
}

function getServiceAccount() {
  const rawValue = readEnv(SERVICE_ACCOUNT_ENV_NAMES);

  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.replace(/\\n/g, "\n");
  const parsed = JSON.parse(normalized);

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
    const collectionName = getCollectionName();

    await db.collection(collectionName).add({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      idNumber: payload.idNumber.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return response.status(200).json({ ok: true });
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