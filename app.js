import { firebaseCollection, getFirebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#loyaltyForm");
const submitButton = form.querySelector("button[type='submit']");
const messageBox = document.querySelector("#formMessage");

const REQUIRED_FIREBASE_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

function showMessage(text, type = "success") {
  messageBox.textContent = text;
  messageBox.className = `message is-visible is-${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

async function isFirebaseConfigured() {
  const firebaseConfig = await getFirebaseConfig();

  return REQUIRED_FIREBASE_KEYS.every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.trim() !== "";
  });
}

function normalizeFormData(formData) {
  return {
    firstName: formData.get("firstName")?.toString().trim() ?? "",
    lastName: formData.get("lastName")?.toString().trim() ?? "",
    idNumber: formData.get("idNumber")?.toString().trim() ?? "",
    email: formData.get("email")?.toString().trim().toLowerCase() ?? "",
    phone: formData.get("phone")?.toString().trim() ?? "",
  };
}

function validateData(data) {
  const idPattern = /^[A-Za-z]?[- ]?\d{5,12}$/;
  const phonePattern = /^[+\d][\d\s()-]{6,20}$/;

  if (Object.values(data).some((value) => value.length === 0)) {
    return "Todos los campos son obligatorios.";
  }

  if (!idPattern.test(data.idNumber)) {
    return "Ingresa una cédula válida. Ejemplo: V-12345678.";
  }

  if (!phonePattern.test(data.phone)) {
    return "Ingresa un número de teléfono válido.";
  }

  return null;
}

function saveLocally(data) {
  const storageKey = "loyalty-form-submissions";
  const previousEntries = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  previousEntries.push({
    ...data,
    savedAt: new Date().toISOString(),
    pendingFirebaseSync: true,
  });

  localStorage.setItem(storageKey, JSON.stringify(previousEntries));
}

let firebaseDbPromise;

async function getFirestoreDb() {
  if (!firebaseDbPromise) {
    firebaseDbPromise = (async () => {
      const [{ initializeApp, getApps }, { getFirestore }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js"),
      ]);

      const firebaseConfig = await getFirebaseConfig();

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return getFirestore(app);
    })();
  }

  return firebaseDbPromise;
}

async function saveToFirebase(data) {
  const db = await getFirestoreDb();
  const { addDoc, collection, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js"
  );

  await addDoc(collection(db, firebaseCollection), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const data = normalizeFormData(new FormData(form));
  const validationError = validateData(data);

  if (validationError) {
    showMessage(validationError, "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Guardando...";

  try {
    if (await isFirebaseConfigured()) {
      await saveToFirebase(data);
      showMessage("Registro guardado correctamente en Firebase.", "success");
    } else {
      saveLocally(data);
      showMessage(
        "Registro guardado temporalmente en este navegador. Configura las variables de entorno en Vercel para guardar en Firebase.",
        "warning"
      );
    }

    form.reset();
  } catch (error) {
    console.error(error);
    showMessage(
      "No se pudo guardar la información. Revisa la configuración de Firebase e inténtalo nuevamente.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar registro";
  }
});
