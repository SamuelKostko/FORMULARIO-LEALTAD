import { localStorageKey, submitFormEndpoint } from "./firebase-config.js";

const form = document.querySelector("#loyaltyForm");
const submitButton = form.querySelector("button[type='submit']");
const messageBox = document.querySelector("#formMessage");

// Modal Elements
const modalOverlay = document.querySelector("#confirmationModal");
const modalDataList = document.querySelector("#modalDataList");
const btnCancelModal = document.querySelector("#btnCancelModal");
const btnConfirmModal = document.querySelector("#btnConfirmModal");

let pendingDataToSave = null;

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
  // Ajustamos la validación en el cliente para tolerar además de letras iniciales, guiones y espacios, 
  // también los puntos "." dentro del campo (porque se los quitaremos antes de enviarlo).
  const idPattern = /^[A-Za-z]?[- .]?\d{1,3}(?:[ .]?\d{3})*(?:[ .]?\d{1,3})?$/;
  const phonePattern = /^[+\d][\d\s()-]{6,20}$/;

  if (Object.values(data).some((value) => value.length === 0)) {
    return "Todos los campos son obligatorios.";
  }

  if (!idPattern.test(data.idNumber) || data.idNumber.replace(/\D/g, "").length < 5) {
    return "Ingresa una cédula válida. Mínimo 5 números.";
  }

  if (!phonePattern.test(data.phone)) {
    return "Ingresa un número de teléfono válido.";
  }

  return null;
}

function saveLocally(data) {
  const previousEntries = JSON.parse(localStorage.getItem(localStorageKey) ?? "[]");
  previousEntries.push({
    nombre: `${data.firstName} ${data.lastName}`,
    idNumber: data.idNumber.replace(/\D/g, ""),
    email: data.email,
    phone: data.phone,
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

  // Preparamos la data temporal y abrimos el modal
  const formattedIdNumber = data.idNumber.replace(/\D/g, "");
  
  pendingDataToSave = data;
  modalDataList.innerHTML = `
    <li><span>Nombre completo:</span> <span>${data.firstName} ${data.lastName}</span></li>
    <li><span>Cédula:</span> <span>${formattedIdNumber}</span></li>
    <li><span>Correo electrónico:</span> <span>${data.email}</span></li>
    <li><span>Teléfono:</span> <span>${data.phone}</span></li>
  `;
  modalOverlay.classList.add("is-active");
});

// Cancelar modal
btnCancelModal.addEventListener("click", () => {
  modalOverlay.classList.remove("is-active");
  pendingDataToSave = null;
});

// Confirmar modal y guardar
btnConfirmModal.addEventListener("click", async () => {
  modalOverlay.classList.remove("is-active");
  if (!pendingDataToSave) return;

  const data = pendingDataToSave;
  
  submitButton.disabled = true;
  submitButton.textContent = "Guardando...";

  try {
    await saveToApi(data);
    showMessage("¡Registro completado con éxito!", "success");
    form.reset();
  } catch (error) {
    console.error(error);

    if (error.message === "FIREBASE_CONFIG_MISSING") {
      saveLocally(data);
      showMessage(
        "¡Registro completado con éxito!",
        "success"
      );
      form.reset();
    } else {
      showMessage(error.message, "error");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar registro";
    pendingDataToSave = null;
  }
});
