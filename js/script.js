"use strict";

// Cuentas fijas únicamente para la demostración académica.
const DEMO_USERS = [
  { id: "cliente1", password: "cliente123", name: "Ana Pérez", email: "ana@example.com", role: "cliente", enabled: true },
  { id: "cliente2", password: "cliente123", name: "Luis Torres", email: "luis@example.com", role: "cliente", enabled: true },
  { id: "admin", password: "admin123", name: "Administrador", email: "admin@example.com", role: "admin", enabled: true },
  { id: "inactivo", password: "cliente123", name: "Cuenta inactiva", email: "inactivo@example.com", role: "cliente", enabled: false }
];
const SERVICES = ["Cambio de aceite", "Revisión de frenos", "Revisión general", "Alineación y balanceo"];
const STATUSES = ["Pendiente", "En revisión", "En proceso", "Finalizado", "Cancelado"];
const STORAGE_KEY = "motorcare.solicitudes.v1";
const USERS_STORAGE_KEY = "motorcare.clientes.v1";
const $ = (selector) => document.querySelector(selector);
let currentUser = null;
let editingId = null;
let requests = [];
let users = [...DEMO_USERS];
let storageAvailable = true;

function showMessage(title, text, icon = "info") {
  if (window.Swal) return Swal.fire({ title, text, icon, confirmButtonColor: "#f36b37" });
  window.alert(`${title}\n${text}`);
  return Promise.resolve();
}

async function confirmDelete() {
  if (!window.Swal) return window.confirm("¿Deseas eliminar esta solicitud? Esta acción no se puede deshacer.");
  const result = await Swal.fire({
    title: "¿Eliminar solicitud?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d95626"
  });
  return result.isConfirmed;
}

function storageFailure() {
  storageAvailable = false;
  const banner = $("#storage-error");
  banner.textContent = "No se pudo acceder a los datos guardados en este navegador. Revisa la configuración de almacenamiento antes de continuar.";
  banner.hidden = false;
}

function loadUsers() {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored === null) return [...DEMO_USERS];
    const registered = JSON.parse(stored);
    const ids = new Set(DEMO_USERS.map((user) => user.id));
    if (!Array.isArray(registered) || !registered.every((user) => {
      if (!user || typeof user.id !== "string" || !/^[a-z0-9_]{3,30}$/.test(user.id) ||
          ids.has(user.id) || typeof user.name !== "string" || !user.name.trim() ||
          typeof user.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
          typeof user.password !== "string" || user.password.length < 6) return false;
      ids.add(user.id);
      return true;
    })) {
      throw new Error("Datos de cuentas inválidos");
    }
    return [...DEMO_USERS, ...registered.map((user) => ({
      id: user.id, name: user.name, email: user.email, password: user.password,
      role: "cliente", enabled: true
    }))];
  } catch (error) {
    console.error("No se pudieron leer las cuentas:", error);
    storageFailure();
    return null;
  }
}

function saveUsers(next) {
  if (!storageAvailable) {
    showMessage("No se pudo guardar", "El almacenamiento no está disponible. La cuenta no se ha creado.", "error");
    return false;
  }
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next.slice(DEMO_USERS.length)));
    users = next;
    return true;
  } catch (error) {
    console.error("No se pudieron guardar las cuentas:", error);
    storageFailure();
    showMessage("No se pudo guardar", "Comprueba el almacenamiento del navegador. La cuenta no se ha creado.", "error");
    return false;
  }
}

function loadRequests() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.ownerId === "string" && STATUSES.includes(item.status))) {
      throw new Error("Datos de solicitudes inválidos");
    }
    return parsed;
  } catch (error) {
    console.error("No se pudieron leer las solicitudes:", error);
    storageFailure();
    return [];
  }
}

function saveRequests(next) {
  if (!storageAvailable) {
    showMessage("No se pudo guardar", "El almacenamiento no está disponible. Tus cambios no se han guardado.", "error");
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    requests = next;
    return true;
  } catch (error) {
    console.error("No se pudieron guardar las solicitudes:", error);
    storageFailure();
    showMessage("No se pudo guardar", "Comprueba el almacenamiento del navegador. Tus cambios no se han guardado.", "error");
    return false;
  }
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validateRequest(data, previous) {
  if (!data.customerName || !data.email || !data.phone || !data.plate || !data.make || !data.model || !data.year || !data.mileage || !data.service || !data.date || !data.time || !data.contact) {
    return "Completa todos los campos obligatorios.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Ingresa un correo electrónico válido.";
  if (!/^\d{7,15}$/.test(data.phone)) return "El teléfono debe contener entre 7 y 15 dígitos.";
  if (!/^[A-Z]{3}-\d{3,4}$/.test(data.plate)) return "La placa debe tener el formato ABC-123 o ABC-1234.";
  if (!/^\d+$/.test(data.year) || Number(data.year) < 1900 || Number(data.year) > new Date().getFullYear() + 1) return "Ingresa un año de vehículo válido.";
  if (!/^\d+$/.test(data.mileage) || !Number.isSafeInteger(Number(data.mileage))) return "El kilometraje debe ser un número entero igual o mayor que cero.";
  if (!SERVICES.includes(data.service)) return "Selecciona un servicio válido.";
  if (!isValidDate(data.date) || (data.date < todayString() && (!previous || data.date !== previous.date))) return "Selecciona una fecha válida que no sea anterior a hoy.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time) || data.time < "08:00" || data.time > "18:00") return "La hora debe estar entre las 08:00 y las 18:00.";
  if (!["Teléfono", "Correo"].includes(data.contact)) return "Selecciona una preferencia de contacto.";
  return "";
}

function fillOwnerOptions() {
  const select = $("#owner");
  select.replaceChildren();
  users.filter((user) => user.enabled).forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.name} (${user.id})`;
    select.append(option);
  });
  select.value = currentUser.id;
}

function fillCustomer(user) {
  $("#customer-name").value = user.name;
  $("#email").value = user.email;
}

function resetForm() {
  editingId = null;
  $("#request-form").reset();
  $("#form-title").textContent = "Agenda tu mantenimiento";
  $("#save-button").textContent = "Registrar solicitud →";
  $("#cancel-edit").hidden = true;
  $("#form-error").hidden = true;
  $("#date").min = todayString();
  $("#year").max = String(new Date().getFullYear() + 1);
  if (currentUser) {
    if (currentUser.role === "admin") {
      $("#owner").value = currentUser.id;
    }
    fillCustomer(currentUser);
  }
}

function updateDashboard() {
  const loggedIn = Boolean(currentUser);
  $("#login-panel").hidden = loggedIn;
  $("#dashboard").hidden = !loggedIn;
  if (!loggedIn) return;
  const admin = currentUser.role === "admin";
  $("#profile-name").textContent = currentUser.name;
  $("#profile-role").textContent = admin ? "ADMINISTRADOR" : "CLIENTE";
  $("#profile-email").textContent = currentUser.email;
  $("#owner-field").hidden = !admin;
  $("#requests-title").textContent = admin ? "Todas las solicitudes" : "Mis mantenimientos";
  $("#requests-description").textContent = admin ? "Administra las solicitudes de todos los clientes." : "Consulta el estado de tus solicitudes.";
  fillOwnerOptions();
  resetForm();
  renderRequests();
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderRequests() {
  const list = $("#request-list");
  list.replaceChildren();
  if (!currentUser) return;
  const visible = currentUser.role === "admin" ? requests : requests.filter((request) => request.ownerId === currentUser.id);
  if (!visible.length) {
    list.append(element("p", "empty-state", "Aún no hay solicitudes para mostrar. Cuando registres una, podrás consultarla aquí."));
    return;
  }
  visible.slice().reverse().forEach((request) => {
    const card = element("article", "request-card");
    const top = element("div", "request-card-top");
    const heading = element("div");
    heading.append(element("h4", "", request.service), element("span", "request-id", `Solicitud ${request.id}`));
    top.append(heading, element("span", "status", request.status));
    const details = element("div", "request-details");
    [
      `Cliente: ${request.customerName} (${request.ownerId})`,
      `Contacto: ${request.email} · ${request.phone}`,
      `Vehículo: ${request.make} ${request.model} · ${request.year} · ${request.plate}`,
      `Kilometraje: ${request.mileage} km`,
      `Cita: ${request.date} · ${request.time}`,
      `Contacto preferido: ${request.contact}`,
      `Opciones: ${request.extras.length ? request.extras.join(", ") : "Ninguna"}`,
      `Observaciones: ${request.notes || "Sin observaciones"}`
    ].forEach((text) => details.append(element("div", "", text)));
    card.append(top, details);
    if (currentUser.role === "admin") {
      const actions = element("div", "request-actions");
      const label = element("label", "visually-hidden", `Estado de solicitud ${request.id}`);
      const select = element("select", "form-select");
      select.id = `status-${request.id}`;
      label.htmlFor = select.id;
      STATUSES.forEach((status) => {
        const option = element("option", "", status);
        option.value = status;
        select.append(option);
      });
      select.value = request.status;
      select.addEventListener("change", () => changeStatus(request.id, select.value));
      const edit = element("button", "button button-outline-dark", "Editar");
      edit.type = "button";
      edit.addEventListener("click", () => editRequest(request.id));
      const remove = element("button", "button button-outline-dark", "Eliminar");
      remove.type = "button";
      remove.addEventListener("click", () => deleteRequest(request.id));
      actions.append(label, select, edit, remove);
      card.append(actions);
    }
    list.append(card);
  });
}

function requireAdmin() {
  if (currentUser && currentUser.role === "admin") return true;
  showMessage("Acceso denegado", "Esta acción está disponible solo para administradores.", "error");
  return false;
}

function changeStatus(id, status) {
  if (!requireAdmin()) return;
  if (!STATUSES.includes(status) || !requests.some((request) => request.id === id)) {
    showMessage("No se pudo actualizar", "La solicitud o el estado no son válidos.", "error");
    renderRequests();
    return;
  }
  if (saveRequests(requests.map((request) => request.id === id ? { ...request, status } : request))) {
    renderRequests();
    showMessage("Estado actualizado", "El cambio se guardó correctamente.", "success");
  } else renderRequests();
}

function editRequest(id) {
  if (!requireAdmin()) return;
  const request = requests.find((item) => item.id === id);
  if (!request) {
    showMessage("Solicitud no encontrada", "No se puede editar este registro.", "error");
    return;
  }
  editingId = id;
  $("#request-form").reset();
  $("#owner").value = request.ownerId;
  $("#customer-name").value = request.customerName;
  $("#email").value = request.email;
  $("#phone").value = request.phone;
  $("#plate").value = request.plate;
  $("#make").value = request.make;
  $("#model").value = request.model;
  $("#year").value = request.year;
  $("#mileage").value = request.mileage;
  $("#service").value = request.service;
  $("#date").min = request.date < todayString() ? request.date : todayString();
  $("#date").value = request.date;
  $("#time").value = request.time;
  document.querySelectorAll('input[name="contact"]').forEach((input) => { input.checked = input.value === request.contact; });
  document.querySelectorAll('input[name="extras"]').forEach((input) => { input.checked = request.extras.includes(input.value); });
  $("#notes").value = request.notes;
  $("#form-title").textContent = "Editar solicitud";
  $("#save-button").textContent = "Guardar cambios →";
  $("#cancel-edit").hidden = false;
  $("#form-error").hidden = true;
  $("#form-title").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteRequest(id) {
  if (!requireAdmin()) return;
  if (!requests.some((request) => request.id === id)) {
    showMessage("Solicitud no encontrada", "No se puede eliminar este registro.", "error");
    return;
  }
  if (!await confirmDelete()) return;
  if (!requireAdmin()) return;
  if (saveRequests(requests.filter((request) => request.id !== id))) {
    if (editingId === id) resetForm();
    renderRequests();
    showMessage("Solicitud eliminada", "El registro se eliminó correctamente.", "success");
  }
}

$("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const username = $("#username").value.trim().toLowerCase();
  const password = $("#password").value;
  const user = users.find((item) => item.id === username && item.password === password && item.enabled);
  if (!user) {
    showMessage("No se pudo iniciar sesión", "Credenciales incorrectas o cuenta deshabilitada.", "error");
    return;
  }
  currentUser = user;
  $("#login-form").reset();
  updateDashboard();
});

function showRegister(show) {
  $("#login-view").hidden = show;
  $("#register-view").hidden = !show;
  $("#register-form").reset();
  $("#register-error").hidden = true;
  if (show) $("#register-name").focus();
  else $("#username").focus();
}

$("#show-register").addEventListener("click", () => showRegister(true));
$("#show-login").addEventListener("click", () => showRegister(false));

$("#register-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#register-name").value.trim();
  const email = $("#register-email").value.trim();
  const id = $("#register-username").value.trim().toLowerCase();
  const password = $("#register-password").value;
  const confirm = $("#register-confirm").value;
  let error = "";
  if (!name || !email || !id || !password || !confirm) error = "Completa todos los campos.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error = "Ingresa un correo electrónico válido.";
  else if (!/^[a-z0-9_]{3,30}$/.test(id)) error = "El usuario debe tener de 3 a 30 letras sin acentos, números o guiones bajos.";
  else if (password.length < 6 || password.length > 100) error = "La contraseña de prueba debe tener entre 6 y 100 caracteres.";
  else if (password !== confirm) error = "Las contraseñas no coinciden.";
  if (error) {
    $("#register-error").textContent = error;
    $("#register-error").hidden = false;
    return;
  }
  const latestUsers = loadUsers();
  if (!latestUsers || !storageAvailable) {
    showMessage("No se pudo crear la cuenta", "No se puede acceder al almacenamiento del navegador.", "error");
    return;
  }
  users = latestUsers;
  if (users.some((user) => user.id === id)) {
    $("#register-error").textContent = "Este usuario ya existe. Elige otro.";
    $("#register-error").hidden = false;
    return;
  }
  const user = { id, name, email, password, role: "cliente", enabled: true };
  if (saveUsers([...users, user])) {
    showRegister(false);
    $("#username").value = id;
    showMessage("Cuenta creada", "Ya puedes iniciar sesión con tu usuario y contraseña de prueba.", "success");
  }
});

$("#logout").addEventListener("click", () => {
  currentUser = null;
  editingId = null;
  $("#request-form").reset();
  $("#request-list").replaceChildren();
  updateDashboard();
});

$("#owner").addEventListener("change", (event) => {
  if (!requireAdmin()) return;
  const owner = users.find((user) => user.id === event.target.value && user.enabled);
  if (owner) fillCustomer(owner);
});

$("#cancel-edit").addEventListener("click", resetForm);

$("#request-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    showMessage("Inicia sesión", "Debes iniciar sesión para registrar una solicitud.", "error");
    return;
  }
  if (editingId && !requireAdmin()) return;
  const previous = editingId ? requests.find((request) => request.id === editingId) : null;
  if (editingId && !previous) {
    showMessage("Solicitud no encontrada", "No se pueden guardar los cambios.", "error");
    return;
  }
  const form = new FormData(event.currentTarget);
  const ownerId = currentUser.role === "admin" ? String(form.get("owner") || "") : currentUser.id;
  if (!users.some((user) => user.id === ownerId && user.enabled)) {
    showMessage("Cliente inválido", "Selecciona un cliente disponible.", "error");
    return;
  }
  const data = {
    ownerId,
    customerName: String(form.get("customerName") || "").trim(),
    email: String(form.get("email") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    plate: String(form.get("plate") || "").trim().toUpperCase(),
    make: String(form.get("make") || "").trim(),
    model: String(form.get("model") || "").trim(),
    year: String(form.get("year") || "").trim(),
    mileage: String(form.get("mileage") || "").trim(),
    service: String(form.get("service") || ""),
    date: String(form.get("date") || ""),
    time: String(form.get("time") || ""),
    contact: String(form.get("contact") || ""),
    extras: form.getAll("extras").map(String),
    notes: String(form.get("notes") || "").trim()
  };
  const error = validateRequest(data, previous);
  if (error) {
    $("#form-error").textContent = error;
    $("#form-error").hidden = false;
    return;
  }
  const record = {
    ...data,
    id: previous ? previous.id : (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    status: previous ? previous.status : "Pendiente"
  };
  const next = previous ? requests.map((request) => request.id === previous.id ? record : request) : [...requests, record];
  if (saveRequests(next)) {
    const wasEditing = Boolean(previous);
    resetForm();
    renderRequests();
    showMessage(wasEditing ? "Solicitud actualizada" : "Solicitud registrada", "Los datos se guardaron en este navegador.", "success");
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    requests = loadRequests();
    renderRequests();
  }
  if (event.key === USERS_STORAGE_KEY || event.key === null) {
    const latestUsers = loadUsers();
    if (latestUsers) {
      users = latestUsers;
      if (currentUser && currentUser.role === "admin") {
        const selectedOwner = $("#owner").value;
        fillOwnerOptions();
        if (users.some((user) => user.id === selectedOwner && user.enabled)) $("#owner").value = selectedOwner;
      }
    }
  }
});

requests = loadRequests();
const savedUsers = loadUsers();
if (savedUsers) users = savedUsers;
updateDashboard();
