const API_URL = "https://script.google.com/macros/s/AKfycbxrMmFzWDWGTNBxriKIlltgKh1HKKgLJpsLso6fOgcHoUUeBfZLnQaN4EFAQSGrIxc_/exec";

// Safe LocalStorage Wrapper
const storage = {
    get: (key) => {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set: (key, val) => {
        try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
    },
    remove: (key) => {
        try { localStorage.removeItem(key); } catch (e) {}
    }
};

let currentOperator = storage.get('logipro-operator') || null;
let allServices = [];
try {
    const cached = storage.get('logipro-cache-services');
    allServices = cached ? JSON.parse(cached) : [];
} catch(e) { allServices = []; }

let currentServiceId = null;
let currentTab = 'ruta'; // 'ruta' or 'historial'

// UI Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const operatorSelect = document.getElementById('operator-select');
const operatorNameHeader = document.getElementById('operator-name-header');
const appViewTitle = document.getElementById('app-view-title');
const servicesList = document.getElementById('services-list');
const loader = document.getElementById('loader');
const detailModal = document.getElementById('detail-modal');
const toast = document.getElementById('toast');

// Nav Buttons
const navRuta = document.getElementById('nav-ruta');
const navHistorial = document.getElementById('nav-historial');

/**
 * Universal Request Wrapper to handle CORS and Apps Script Redirects
 */
async function callAPI(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' }, // Avoid preflight OPTIONS
            body: JSON.stringify({ action, ...data })
        });
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message || "Error del servidor");
        
        return result;
    } catch (err) {
        console.error(`API Error [${action}]:`, err);
        throw err;
    }
}

// Initialize
async function init() {
    if (currentOperator) {
        showApp();
    } else {
        await loadOperators();
    }
}

async function loadOperators() {
    const cachedOpsStr = storage.get('logipro-cache-operators');
    if (cachedOpsStr) {
        try { renderOperatorSelect(JSON.parse(cachedOpsStr)); } catch(e) {}
    }

    try {
        const data = await callAPI('syncOperatorData');
        storage.set('logipro-cache-operators', JSON.stringify(data.base_operadores));
        renderOperatorSelect(data.base_operadores);
    } catch (err) {
        if (!cachedOpsStr) {
            operatorSelect.innerHTML = '<option value="">Error al cargar (Toca para reintentar)</option>';
            operatorSelect.onclick = () => { operatorSelect.onclick = null; loadOperators(); };
        }
    }
}

function renderOperatorSelect(ops) {
    if (!ops || !Array.isArray(ops)) return;
    operatorSelect.innerHTML = '<option value="">Selecciona tu nombre...</option>' + 
        ops.map(op => `<option value="${op["Nombre / Empresa"]}">${op["Nombre / Empresa"]}</option>`).join('');
}

function showApp() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    operatorNameHeader.innerText = currentOperator;
    
    if (allServices.length > 0) {
        renderServices();
    }
    
    fetchServices();
}

async function fetchServices() {
    loader.classList.remove('hidden');
    
    try {
        const data = await callAPI('syncOperatorData');
        
        // Robust filtering
        const operatorCurrent = (currentOperator || "").toString().trim().toLowerCase();
        
        allServices = data.servicios.filter(s => {
            const opInSheet = (s.Operador || "").toString().trim().toLowerCase();
            return opInSheet === operatorCurrent && s.ID && s.Cliente;
        });
        
        storage.set('logipro-cache-services', JSON.stringify(allServices));
        renderServices();
    } catch (err) {
        console.error("Error fetching services:", err);
        if (allServices.length === 0) {
            showErrorState("Error de conexión al servidor");
        } else {
            showToast("Usando datos locales (Sin conexión)");
        }
    } finally {
        loader.classList.add('hidden');
    }
}

function showErrorState(msg) {
    servicesList.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center px-6">
            <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <i class="ph-bold ph-wifi-slash text-3xl"></i>
            </div>
            <p class="font-bold text-slate-800 mb-2">${msg}</p>
            <p class="text-xs text-slate-400 mb-6">Revisa tu internet o intenta nuevamente.</p>
            <button onclick="fetchServices()" class="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
                <i class="ph-bold ph-arrows-clockwise"></i>
                Reintentar
            </button>
        </div>
    `;
}

function isStatusCompleted(status) {
    const s = (status || "").toLowerCase();
    return s.includes('completado') || s.includes('finalizado') || s.includes('terminado');
}

function renderServices() {
    const filtered = allServices.filter(s => {
        const isCompleted = isStatusCompleted(s["Estado Ruta"]);
        return currentTab === 'ruta' ? !isCompleted : isCompleted;
    });

    appViewTitle.innerText = currentTab === 'ruta' ? 'Próximos Servicios' : 'Historial de Viajes';

    if (filtered.length === 0) {
        const message = currentTab === 'ruta' ? 'No tienes servicios pendientes' : 'No hay viajes en el historial';
        servicesList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                <i class="ph-bold ph-smiley-blank text-5xl mb-4"></i>
                <p class="font-bold">${message}</p>
            </div>
        `;
        return;
    }

    servicesList.innerHTML = filtered.map(s => {
        const paymentStatus = s["Estado Pago"] || "Pendiente";
        const isPaid = paymentStatus.toLowerCase().includes('pagado') || paymentStatus.toLowerCase().includes('ok');
        const pillLabel = isPaid ? "PAGADO" : "PAGO PENDIENTE";
        const statusClass = isPaid ? 'pagado' : 'pendiente';
        
        if (currentTab === 'historial') {
            return `
                <div class="service-card" onclick="openDetail('${s.ID}')">
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <h3 class="text-lg font-black text-slate-800 line-clamp-1">${s.Cliente}</h3>
                            <div class="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                <i class="ph-bold ph-calendar-blank"></i>
                                <span>${s["Fecha de Servicio"]}</span>
                            </div>
                            <div class="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                <i class="ph-bold ph-map-pin"></i>
                                <span class="truncate max-w-[150px]">${s.Destino}</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-2 shrink-0">
                            <div class="text-right">
                                <span class="text-[9px] uppercase opacity-50 block leading-none mb-1">Ganancia</span>
                                <span class="ganancia-large">${formatCLP(s.Costo)}</span>
                            </div>
                            <span class="status-pill ${statusClass}">${pillLabel}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="service-card" onclick="openDetail('${s.ID}')">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1 mr-2">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px] block">${s["Tipo Servicio"] || "SERVICIO"}</span>
                        <h3 class="text-lg font-black text-slate-800 mt-1 line-clamp-1">${s.Cliente}</h3>
                    </div>
                    <div class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0">
                        #${s.ID}
                    </div>
                </div>
                <div class="flex flex-col gap-2 mb-4">
                    <div class="flex items-center gap-2 text-slate-500 text-sm">
                        <i class="ph-bold ph-map-pin"></i>
                        <span class="truncate">${s.Destino}</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-500 text-sm">
                        <i class="ph-bold ph-calendar-blank"></i>
                        <span>${s["Fecha de Servicio"]}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-slate-50">
                    <div class="flex items-center gap-3">
                        <div class="cost-tag">
                            <span class="text-[9px] uppercase opacity-50 block leading-none mb-1">Ganancia</span>
                            ${formatCLP(s.Costo)}
                        </div>
                        <span class="status-pill ${statusClass}">${pillLabel}</span>
                    </div>
                    <i class="ph-bold ph-caret-right text-slate-300"></i>
                </div>
            </div>
        `;
    }).join('');
}

function formatCLP(value) {
    if (!value || value === "-") return "$0";
    const str = value.toString().replace(/[^0-9.-]+/g, "");
    const num = parseFloat(str);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(num);
}

function openDetail(id) {
    const s = allServices.find(srv => srv.ID == id);
    if (!s) return;
    
    currentServiceId = id;
    document.getElementById('modal-service-id').innerText = `SERVICIO #${id}`;
    document.getElementById('modal-client-name').innerText = s.Cliente;
    document.getElementById('modal-destination').innerText = s.Destino;
    document.getElementById('modal-type').innerText = s["Tipo Servicio"] || "General";
    
    const receiptContainer = document.getElementById('modal-payment-receipt-container');
    const downloadBtn = document.getElementById('modal-download-btn');
    
    if (s["Link Archivo"] && s["Link Archivo"].startsWith('http')) {
        downloadBtn.href = s["Link Archivo"];
        receiptContainer.classList.remove('hidden');
    } else {
        receiptContainer.classList.add('hidden');
    }
    
    detailModal.classList.remove('hidden');
}

function closeModal() {
    detailModal.classList.add('hidden');
    currentServiceId = null;
}

async function updateStatus(newStatus) {
    const s = allServices.find(srv => srv.ID == currentServiceId);
    if (!s) return;

    const btnId = newStatus === 'En Ruta' ? 'btn-en-ruta' : 'btn-completado';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<i class="ph-bold ph-circle-notch animate-spin"></i> <span>...</span>`;

    // Optimistic UI
    const oldStatus = s["Estado Ruta"];
    s["Estado Ruta"] = newStatus;
    storage.set('logipro-cache-services', JSON.stringify(allServices));

    try {
        await callAPI('operatorUpdateStatus', {
            data: { "ID": s.ID, "Estado Ruta": newStatus }
        });
        
        const isCompleted = isStatusCompleted(newStatus);
        if (isCompleted && currentTab !== 'historial') {
            switchTab('historial');
        } else if (!isCompleted && currentTab !== 'ruta') {
            switchTab('ruta');
        } else {
            renderServices(); 
        }

        closeModal();
        showToast(`Estado: ${newStatus}`);
    } catch (err) {
        showToast("Error de conexión");
        s["Estado Ruta"] = oldStatus; // Revert
        storage.set('logipro-cache-services', JSON.stringify(allServices));
        renderServices();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    navRuta.classList.remove('nav-active', 'text-blue-600');
    navRuta.classList.add('text-slate-300');
    navRuta.querySelector('i').classList.replace('ph-fill', 'ph-bold');
    
    navHistorial.classList.remove('nav-active', 'text-blue-600');
    navHistorial.classList.add('text-slate-300');
    navHistorial.querySelector('i').classList.replace('ph-fill', 'ph-bold');
    
    const activeBtn = tab === 'ruta' ? navRuta : navHistorial;
    activeBtn.classList.add('nav-active');
    activeBtn.classList.remove('text-slate-300');
    activeBtn.querySelector('i').classList.replace('ph-bold', 'ph-fill');
    
    renderServices();
}

function showToast(msg) {
    const toastText = document.getElementById('toast-text');
    if (toastText) toastText.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Event Listeners
document.getElementById('login-btn').addEventListener('click', () => {
    const selected = operatorSelect.value;
    if (selected) {
        currentOperator = selected;
        storage.set('logipro-operator', currentOperator);
        showApp();
    } else {
        alert("Selecciona tu nombre");
    }
});

document.getElementById('refresh-btn').addEventListener('click', fetchServices);
navRuta.addEventListener('click', () => switchTab('ruta'));
navHistorial.addEventListener('click', () => switchTab('historial'));

document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm("¿Cerrar sesión?")) {
        storage.remove('logipro-operator');
        storage.remove('logipro-cache-services');
        location.reload();
    }
});

// Start
init();
