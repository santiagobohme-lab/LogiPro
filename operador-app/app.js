const API_URL = "https://script.google.com/macros/s/AKfycbxrMmFzWDWGTNBxriKIlltgKh1HKKgLJpsLso6fOgcHoUUeBfZLnQaN4EFAQSGrIxc_/exec";

let currentOperator = localStorage.getItem('logipro-operator') || null;
let allServices = JSON.parse(localStorage.getItem('logipro-cache-services')) || [];
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

// Initialize
async function init() {
    if (currentOperator) {
        showApp();
    } else {
        await loadOperators();
    }
}

async function loadOperators() {
    const cachedOps = localStorage.getItem('logipro-cache-operators');
    if (cachedOps) {
        renderOperatorSelect(JSON.parse(cachedOps));
    }

    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.status === 'success') {
            localStorage.setItem('logipro-cache-operators', JSON.stringify(data.base_operadores));
            renderOperatorSelect(data.base_operadores);
        }
    } catch (err) {
        console.error("Error loading operators:", err);
        if (!cachedOps) operatorSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
}

function renderOperatorSelect(ops) {
    operatorSelect.innerHTML = '<option value="">Selecciona tu nombre...</option>' + 
        ops.map(op => `<option value="${op["Nombre / Empresa"]}">${op["Nombre / Empresa"]}</option>`).join('');
}

function showApp() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    operatorNameHeader.innerText = currentOperator;
    
    // Initial render from cache if available
    if (allServices.length > 0) {
        renderServices();
    }
    
    fetchServices();
}

async function fetchServices() {
    loader.classList.remove('hidden');
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.status === 'success') {
            // FIX DUPLICATES & MISMATCHES: Trim and ignore case
            allServices = data.servicios.filter(s => {
                const operatorInSheet = (s.Operador || "").toString().trim().toLowerCase();
                const operatorCurrent = currentOperator.toString().trim().toLowerCase();
                return operatorInSheet === operatorCurrent && s.ID && s.Cliente;
            });
            
            localStorage.setItem('logipro-cache-services', JSON.stringify(allServices));
            renderServices();
        }
    } catch (err) {
        console.error("Error fetching services:", err);
        if (allServices.length === 0) {
            servicesList.innerHTML = '<p class="text-center text-red-500 py-10 font-bold">Error de conexión</p>';
        }
    } finally {
        loader.classList.add('hidden');
    }
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

    // Update Header Title
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
        const serviceStatus = s["Estado Ruta"] || "Pendiente";
        const paymentStatus = s["Estado Pago"] || "Pendiente";
        
        // Custom Label from user request: "Pago pendiente/Pagado"
        const isPaid = paymentStatus.toLowerCase().includes('pagado') || paymentStatus.toLowerCase().includes('ok');
        const pillLabel = isPaid ? "PAGADO" : "PAGO PENDIENTE";
        const statusClass = isPaid ? 'pagado' : 'pendiente'; // Green if Pagado, Yellow if Pendiente
        
        if (currentTab === 'historial') {
            return `
                <div class="service-card" onclick="openDetail('${s.ID}')">
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <h3 class="text-lg font-black text-slate-800">${s.Cliente}</h3>
                            <div class="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                <i class="ph-bold ph-calendar-blank"></i>
                                <span>${s["Fecha de Servicio"]}</span>
                            </div>
                            <div class="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                <i class="ph-bold ph-map-pin"></i>
                                <span>${s.Destino}</span>
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
                    <div>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px]">${s["Tipo Servicio"]}</span>
                        <h3 class="text-lg font-black text-slate-800 mt-1">${s.Cliente}</h3>
                    </div>
                    <div class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        #${s.ID}
                    </div>
                </div>
                <div class="flex flex-col gap-2 mb-4">
                    <div class="flex items-center gap-2 text-slate-500 text-sm">
                        <i class="ph-bold ph-map-pin"></i>
                        <span>${s.Destino}</span>
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
    const num = parseFloat(value.toString().replace(/[^0-9.-]+/g, ""));
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
    s["Estado Ruta"] = newStatus;
    localStorage.setItem('logipro-cache-services', JSON.stringify(allServices));

    // Auto-switch tab based on state change
    const isCompleted = isStatusCompleted(newStatus);
    if (isCompleted && currentTab !== 'historial') {
        switchTab('historial');
    } else if (!isCompleted && currentTab !== 'ruta') {
        switchTab('ruta');
    } else {
        renderServices(); // Always refresh to reflect internal logical changes
    }

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
                    "Estado Ruta": newStatus
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

function switchTab(tab) {
    currentTab = tab;
    
    // Update Nav UI
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

navRuta.addEventListener('click', () => switchTab('ruta'));
navHistorial.addEventListener('click', () => switchTab('historial'));

document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm("¿Cerrar sesión?")) {
        localStorage.removeItem('logipro-operator');
        localStorage.removeItem('logipro-cache-services');
        location.reload();
    }
});

// Start
init();
