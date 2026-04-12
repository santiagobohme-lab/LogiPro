const API_URL = "https://script.google.com/macros/s/AKfycbxrMmFzWDWGTNBxriKIlltgKh1HKKgLJpsLso6fOgcHoUUeBfZLnQaN4EFAQSGrIxc_/exec";

let currentOperator = localStorage.getItem('logipro-operator') || null;
let allServices = [];
let currentServiceId = null;

// UI Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const operatorSelect = document.getElementById('operator-select');
const operatorNameHeader = document.getElementById('operator-name-header');
const servicesList = document.getElementById('services-list');
const loader = document.getElementById('loader');
const detailModal = document.getElementById('detail-modal');
const toast = document.getElementById('toast');

// Initialize
async function init() {
    if (currentOperator) {
        showApp();
    } else {
        await loadOperators();
    }
}

async function loadOperators() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.status === 'success') {
            const ops = data.base_operadores;
            operatorSelect.innerHTML = '<option value="">Selecciona tu nombre...</option>' + 
                ops.map(op => `<option value="${op["Nombre / Empresa"]}">${op["Nombre / Empresa"]}</option>`).join('');
        }
    } catch (err) {
        console.error("Error loading operators:", err);
        operatorSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
}

function showApp() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    operatorNameHeader.innerText = currentOperator;
    fetchServices();
}

async function fetchServices() {
    loader.classList.remove('hidden');
    servicesList.innerHTML = '';
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.status === 'success') {
            allServices = data.servicios.filter(s => s.Operador === currentOperator);
            renderServices();
        }
    } catch (err) {
        console.error("Error fetching services:", err);
        servicesList.innerHTML = '<p class="text-center text-red-500 py-10 font-bold">Error de conexión</p>';
    } finally {
        loader.classList.add('hidden');
    }
}

function renderServices() {
    if (allServices.length === 0) {
        servicesList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                <i class="ph-bold ph-smiley-blank text-5xl mb-4"></i>
                <p class="font-bold">No tienes servicios asignados hoy</p>
            </div>
        `;
        return;
    }

    servicesList.innerHTML = allServices.map(s => {
        const status = s["Estado Servicio"] || "Pendiente";
        const statusClass = status.toLowerCase().includes('completado') ? 'completado' : 
                          status.toLowerCase().includes('ruta') ? 'ruta' : 'pendiente';
        
        return `
            <div class="service-card" onclick="openDetail('${s.ID}')">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span class="status-pill ${statusClass}">${status}</span>
                        <h3 class="text-lg font-black text-slate-800 mt-2">${s.Cliente}</h3>
                    </div>
                    <div class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        #${s.ID}
                    </div>
                </div>
                <div class="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <i class="ph-bold ph-map-pin"></i>
                    <span>${s.Destino}</span>
                </div>
                <div class="flex items-center gap-2 text-slate-500 text-sm">
                    <i class="ph-bold ph-calendar-blank"></i>
                    <span>${s["Fecha de Servicio"]}</span>
                </div>
            </div>
        `;
    }).join('');
}

function openDetail(id) {
    const s = allServices.find(srv => srv.ID == id);
    if (!s) return;
    
    currentServiceId = id;
    document.getElementById('modal-service-id').innerText = `SERVICIO #${id}`;
    document.getElementById('modal-client-name').innerText = s.Cliente;
    document.getElementById('modal-destination').innerText = s.Destino;
    document.getElementById('modal-type').innerText = s["Tipo Servicio"];
    
    detailModal.classList.remove('hidden');
}

function closeModal() {
    detailModal.classList.add('hidden');
    currentServiceId = null;
}

async function updateStatus(newStatus) {
    const s = allServices.find(srv => srv.ID == currentServiceId);
    if (!s) return;

    // Optimistic UI
    s["Estado Servicio"] = newStatus;
    renderServices();
    closeModal();
    showToast(`Estado cambiado a: ${newStatus}`);

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'upsertService',
                data: {
                    "ID": s.ID,
                    "Estado Servicio": newStatus
                }
            })
        });
        const result = await res.json();
        if (result.status !== 'success') throw new Error();
    } catch (err) {
        showToast("Error al sincronizar con Matriz");
        fetchServices(); // Revert
    }
}

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.replace('opacity-0', 'opacity-100');
    toast.classList.replace('translate-y-4', 'translate-y-0');
    
    setTimeout(() => {
        toast.classList.replace('opacity-100', 'opacity-0');
        toast.classList.replace('translate-y-0', 'translate-y-4');
    }, 3000);
}

// Event Listeners
document.getElementById('login-btn').addEventListener('click', () => {
    const selected = operatorSelect.value;
    if (selected) {
        currentOperator = selected;
        localStorage.setItem('logipro-operator', currentOperator);
        showApp();
    } else {
        alert("Por favor selecciona tu nombre");
    }
});

document.getElementById('refresh-btn').addEventListener('click', fetchServices);

document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm("¿Cerrar sesión?")) {
        localStorage.removeItem('logipro-operator');
        location.reload();
    }
});

// Start
init();
