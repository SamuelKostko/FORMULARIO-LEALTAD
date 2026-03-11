import { localStorageKey, submitFormEndpoint } from "./firebase-config.js";

const form = document.querySelector("#loyaltyForm");
const submitButton = form.querySelector("button[type='submit']");
const messageBox = document.querySelector("#formMessage");

function showMessage(text, type = "success") {
  messageBox.textContent = text;
  messageBox.className = `message is-visible is-${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
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
  const previousEntries = JSON.parse(localStorage.getItem(localStorageKey) ?? "[]");
  previousEntries.push({
    ...data,
    savedAt: new Date().toISOString(),
    pendingFirebaseSync: true,
  });

  localStorage.setItem(localStorageKey, JSON.stringify(previousEntries));
}

async function saveToApi(data) {
  const response = await fetch(submitFormEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "No se pudo guardar la información.");
  }

  return payload;
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
    await saveToApi(data);
    showMessage("Registro guardado correctamente en Firebase.", "success");
    form.reset();
  } catch (error) {
    console.error(error);

    if (error.message === "FIREBASE_CONFIG_MISSING") {
      saveLocally(data);
      showMessage(
        "Registro guardado temporalmente en este navegador. Cuando me compartas las credenciales, llenamos el .env y quedará conectado en Vercel.",
        "warning"
      );
      form.reset();
    } else {
      showMessage(error.message, "error");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar registro";
  }
});
