import { localStorageKey, submitFormEndpoint } from "./firebase-config.js";

// Initialize Flatpickr
flatpickr("#birthDate", {
  locale: "es",
  dateFormat: "Y-m-d", // standard date format for database
  altInput: true,
  altFormat: "j \\de F, Y", // more user-friendly: 15 de abril, 1990
  maxDate: "today",
  disableMobile: "true" // force aesthetic view on mobile too
});

const form = document.querySelector("#loyaltyForm");
const submitButton = form.querySelector("button[type='submit']");
const messageBox = document.querySelector("#formMessage");

const sedeSelect = form.querySelector("#sede");
const sedeOtherField = form.querySelector("#sedeOtherField");
const sedeOtherInput = form.querySelector("#sedeOther");

// Modal Elements
const modalOverlay = document.querySelector("#confirmationModal");
const modalDataList = document.querySelector("#modalDataList");
const btnCancelModal = document.querySelector("#btnCancelModal");
const btnConfirmModal = document.querySelector("#btnConfirmModal");

// Success Modal
const successModal = document.querySelector("#successModal");
const btnSuccessClose = document.querySelector("#btnSuccessClose");

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
    birthDate: formData.get("birthDate")?.toString().trim() ?? "",
    sede: formData.get("sede")?.toString().trim() ?? "",
    sedeOther: formData.get("sedeOther")?.toString().trim() ?? "",
  };
}

function resolveSede(data) {
  if (data.sede === "OTROS") {
    return data.sedeOther;
  }

  return data.sede;
}

function validateData(data) {
  // Ajustamos la validación en el cliente para tolerar además de letras iniciales, guiones y espacios, 
  // también los puntos "." dentro del campo (porque se los quitaremos antes de enviarlo).
  const idPattern = /^[A-Za-z]?[- .]?\d{1,3}(?:[ .]?\d{3})*(?:[ .]?\d{1,3})?$/;
  const phonePattern = /^[+\d][\d\s()-]{6,20}$/;

  const requiredBaseFields = [
    data.firstName,
    data.lastName,
    data.idNumber,
    data.email,
    data.phone,
    data.birthDate,
    data.sede,
  ];

  if (requiredBaseFields.some((value) => value.length === 0)) {
    return "Todos los campos son obligatorios.";
  }

  if (data.sede === "OTROS" && data.sedeOther.length === 0) {
    return "Indica la sede.";
  }

  if (!idPattern.test(data.idNumber) || data.idNumber.replace(/\D/g, "").length < 5) {
    return "Ingresa una cédula válida. Mínimo 5 números.";
  }

  if (!phonePattern.test(data.phone)) {
    return "Ingresa un número de teléfono válido.";
  }

  if (!data.birthDate) {
    return "La fecha de nacimiento es obligatoria.";
  }

  return null;
}

function updateSedeOtherVisibility() {
  const isOther = sedeSelect.value === "OTROS";
  sedeOtherField.classList.toggle("is-hidden", !isOther);
  sedeOtherInput.required = isOther;

  if (!isOther) {
    sedeOtherInput.value = "";
  }
}

updateSedeOtherVisibility();
sedeSelect.addEventListener("change", updateSedeOtherVisibility);

function saveLocally(data) {
  const previousEntries = JSON.parse(localStorage.getItem(localStorageKey) ?? "[]");
  previousEntries.push({
    nombre: `${data.firstName} ${data.lastName}`,
    idNumber: data.idNumber.replace(/\D/g, ""),
    email: data.email,
    phone: data.phone,
    birthDate: data.birthDate,
    sede: data.sede,
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

  const resolvedSede = resolveSede(data);

  pendingDataToSave = {
    ...data,
    sede: resolvedSede,
  };
  modalDataList.innerHTML = `
    <li><span>Nombre completo:</span> <span>${data.firstName} ${data.lastName}</span></li>
    <li><span>Cédula:</span> <span>${formattedIdNumber}</span></li>
    <li><span>Correo electrónico:</span> <span>${data.email}</span></li>
    <li><span>Teléfono:</span> <span>${data.phone}</span></li>
    <li><span>Fecha de nacimiento:</span> <span>${data.birthDate}</span></li>
    <li><span>Sede:</span> <span>${resolvedSede}</span></li>
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
    form.reset();
    successModal.classList.add("is-active");
  } catch (error) {
    console.error(error);

    if (error.message === "FIREBASE_CONFIG_MISSING") {
      saveLocally(data);
      form.reset();
      successModal.classList.add("is-active");
    } else {
      showMessage(error.message, "error");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar registro";
    pendingDataToSave = null;
  }
});

// Cerrar modal de éxito
btnSuccessClose.addEventListener("click", () => {
  successModal.classList.remove("is-active");
});
