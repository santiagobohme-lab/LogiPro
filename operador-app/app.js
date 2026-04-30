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
    const cachedOpsStr = storage.get('logipro-cache-choferes');
    if (cachedOpsStr) {
        try { renderOperatorSelect(JSON.parse(cachedOpsStr)); } catch(e) {}
    }

    try {
        const data = await callAPI('syncOperatorData');
        storage.set('logipro-cache-choferes', JSON.stringify(data.choferes));
        renderOperatorSelect(data.choferes);
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
        ops.map(op => `<option value="${op["Nombre"]}">${op["Nombre"]}</option>`).join('');
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
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('animate-spin');
    
    try {
        const data = await callAPI('syncOperatorData');
        
        // Robust filtering
        const operatorCurrent = (currentOperator || "").toString().trim().toLowerCase();
        
        allServices = data.servicios.filter(s => {
            const opInSheet = (s["Chofer Asignado"] || "").toString().trim().toLowerCase();
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
        const refreshIcon = document.getElementById('refresh-icon');
        if (refreshIcon) refreshIcon.classList.remove('animate-spin');
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
                        <div class="flex flex-col items-end justify-center gap-1 shrink-0">
                            <span class="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">${s["Estado Ruta"] || 'Completado'}</span>
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
                        <span class="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded">${s["Estado Ruta"] || 'Asignado'}</span>
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
    document.getElementById('modal-patente').innerText = s["Patente Asignada"] || "No asignada";
    document.getElementById('modal-destination').innerText = s.Destino;
    document.getElementById('modal-type').innerText = s["Tipo Servicio"] || "General";

    // Set visibility of action buttons based on status
    const status = (s["Estado Ruta"] || "Asignado").toLowerCase();
    
    document.getElementById('btn-iniciar').classList.add('hidden');
    document.getElementById('btn-llegada').classList.add('hidden');
    document.getElementById('btn-completado').classList.add('hidden');
    document.getElementById('upload-btn').classList.add('hidden');
    
    if (status.includes('completado') || status.includes('finalizado')) {
        // Ningún botón de estado, tal vez solo ver comprobante.
    } else if (status.includes('tránsito') || status.includes('ruta')) {
        document.getElementById('btn-llegada').classList.remove('hidden');
    } else if (status.includes('destino') || status.includes('carga') || status.includes('llegada')) {
        document.getElementById('btn-completado').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    } else {
        // Asignado
        document.getElementById('btn-iniciar').classList.remove('hidden');
    }
    
    const uploadBtn = document.getElementById('upload-btn');
    const btnCompletado = document.getElementById('btn-completado');

    if (s["Link Archivo"] && s["Link Archivo"].startsWith('http')) {
        uploadBtn.innerHTML = `<i class="ph-bold ph-check-circle text-xl"></i> Guía Subida Correctamente`;
        uploadBtn.classList.replace('bg-slate-50', 'bg-emerald-50');
        uploadBtn.classList.replace('text-slate-500', 'text-emerald-600');
        uploadBtn.onclick = () => window.open(s["Link Archivo"], '_blank');
        
        btnCompletado.disabled = false;
        btnCompletado.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        uploadBtn.innerHTML = `<i class="ph-bold ph-camera"></i> Subir Guía de Despacho`;
        uploadBtn.classList.replace('bg-emerald-50', 'bg-slate-50');
        uploadBtn.classList.replace('text-emerald-600', 'text-slate-500');
        uploadBtn.onclick = () => openCameraModal();
        
        btnCompletado.disabled = true;
        btnCompletado.classList.add('opacity-50', 'cursor-not-allowed');
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

    if (newStatus === 'Completado' && (!s["Link Archivo"] || !s["Link Archivo"].startsWith('http'))) {
        showToast("Debes subir la Guía de Despacho antes de finalizar");
        return;
    }

    let btnId = 'btn-iniciar';
    if(newStatus === 'En Tránsito') btnId = 'btn-iniciar';
    else if(newStatus === 'En Destino') btnId = 'btn-llegada';
    else if(newStatus === 'Completado') btnId = 'btn-completado';

    const btn = document.getElementById(btnId);
    if(!btn) return;
    
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<i class="ph-bold ph-circle-notch animate-spin"></i> <span>...</span>`;

    // Optimistic UI
    const oldStatus = s["Estado Ruta"];
    s["Estado Ruta"] = newStatus;
    storage.set('logipro-cache-services', JSON.stringify(allServices));

    // Get GPS
    let gpsCoords = "Ubicación no obtenida";
    try {
        if (navigator.geolocation) {
            const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout: 5000}));
            gpsCoords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        }
    } catch(e) { console.log("GPS no disponible"); }

    const timestamp = new Date().toISOString();
    const logData = `[${timestamp}] Chofer: ${currentOperator} | Patente: ${s["Patente Asignada"]} | Estado: ${newStatus} | GPS: ${gpsCoords}`;
    console.log(logData); // Aquí se podría guardar en una columna "Historial de Eventos" si existiera

    try {
        await callAPI('operatorUpdateStatus', {
            data: { 
                "ID": s.ID, 
                "Estado Ruta": newStatus,
                "Último GPS": gpsCoords,
                "Última Actualización": timestamp,
                "Chofer Asignado": currentOperator,
                "Patente Asignada": s["Patente Asignada"]
            }
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

// --- CUSTOM CAMERA IMPLEMENTATION ---
let cameraStream = null;
let imageCaptureObj = null;
let torchOn = false;

async function openCameraModal() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-feed');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 4000 }, height: { ideal: 3000 } },
            audio: false
        });
        video.srcObject = cameraStream;
        
        try {
            const track = cameraStream.getVideoTracks()[0];
            
            // Torch Logic
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            const torchBtn = document.getElementById('camera-torch-btn');
            if (capabilities && capabilities.torch) {
                torchBtn.classList.remove('hidden');
                torchBtn.onclick = async () => {
                    try {
                        torchOn = !torchOn;
                        await track.applyConstraints({ advanced: [{ torch: torchOn }] });
                        const torchIcon = document.getElementById('torch-icon');
                        if (torchOn) {
                            torchBtn.classList.replace('bg-white/20', 'bg-yellow-400');
                            torchIcon.classList.replace('ph-lightning', 'ph-lightning-slash');
                            torchBtn.classList.replace('text-white', 'text-yellow-900');
                        } else {
                            torchBtn.classList.replace('bg-yellow-400', 'bg-white/20');
                            torchIcon.classList.replace('ph-lightning-slash', 'ph-lightning');
                            torchBtn.classList.replace('text-yellow-900', 'text-white');
                        }
                    } catch (err) {
                        console.error("Torch error:", err);
                        torchOn = !torchOn;
                    }
                };
            } else {
                if(torchBtn) torchBtn.classList.add('hidden');
            }
            
            // ImageCapture Logic
            if (typeof ImageCapture !== 'undefined') {
                imageCaptureObj = new ImageCapture(track);
            }
        } catch (e) {
            imageCaptureObj = null;
        }
    } catch (err) {
        console.error("Camera access failed", err);
        showToast("Cámara web no soportada (" + err.name + "). Abriendo nativa...");
        closeCameraModal();
        document.getElementById('file-upload-input').click();
    }
}

function closeCameraModal() {
    const modal = document.getElementById('camera-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            if (torchOn && track.applyConstraints) {
                try { track.applyConstraints({ advanced: [{ torch: false }] }); } catch(e){}
            }
            track.stop();
        });
        cameraStream = null;
    }
    imageCaptureObj = null;
    
    torchOn = false;
    const torchBtn = document.getElementById('camera-torch-btn');
    const torchIcon = document.getElementById('torch-icon');
    if (torchBtn && torchIcon) {
        torchBtn.classList.replace('bg-yellow-400', 'bg-white/20');
        torchIcon.classList.replace('ph-lightning-slash', 'ph-lightning');
        torchBtn.classList.replace('text-yellow-900', 'text-white');
    }
}

document.getElementById('camera-close-btn')?.addEventListener('click', closeCameraModal);

function playShutterSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
}

document.getElementById('camera-capture-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<div class="w-16 h-16 rounded-full flex items-center justify-center"><i class="ph-bold ph-circle-notch animate-spin text-white text-3xl"></i></div>`;
    btn.disabled = true;
    
    playShutterSound();
    
    const flash = document.getElementById('camera-flash');
    if (flash) {
        flash.classList.remove('opacity-0');
        flash.classList.add('opacity-100');
        setTimeout(() => {
            flash.classList.remove('opacity-100');
            flash.classList.add('opacity-0');
        }, 50);
    }
    
    const instruction = document.getElementById('camera-instruction');
    const origText = instruction ? instruction.innerText : "";
    const origClass = instruction ? instruction.className : "";
    
    if (instruction) {
        instruction.innerText = "¡Mantén quieto el celular, capturando...!";
        instruction.classList.replace('bg-black/40', 'bg-amber-600/90');
        instruction.classList.replace('text-white/90', 'text-white');
    }

    try {
        const video = document.getElementById('camera-feed');
        const canvas = document.getElementById('camera-canvas');
        const container = video.parentElement;
        const guide = document.getElementById('camera-guide');
        
        const scale = Math.max(container.clientWidth / video.videoWidth, container.clientHeight / video.videoHeight);
        const displayedVideoWidth = video.videoWidth * scale;
        const displayedVideoHeight = video.videoHeight * scale;
        const offsetX = (container.clientWidth - displayedVideoWidth) / 2;
        const offsetY = (container.clientHeight - displayedVideoHeight) / 2;
        
        const guideRect = guide.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const guideX = guideRect.left - containerRect.left - offsetX;
        const guideY = guideRect.top - containerRect.top - offsetY;
        
        // Percentages relative to the video stream
        const pctX = (guideX / scale) / video.videoWidth;
        const pctY = (guideY / scale) / video.videoHeight;
        const pctWidth = (guideRect.width / scale) / video.videoWidth;
        const pctHeight = (guideRect.height / scale) / video.videoHeight;
        
        // Margen de error (1%) hacia AFUERA para asegurar que capture todo el papel
        const trimX = pctWidth * -0.01;
        const trimY = pctHeight * -0.01;
        const safePctX = pctX + trimX;
        const safePctY = pctY + trimY;
        const safePctWidth = pctWidth - (trimX * 2);
        const safePctHeight = pctHeight - (trimY * 2);
        
        const ctx = canvas.getContext('2d');
        let dataUrl = null;
        
        if (imageCaptureObj) {
            try {
                const blob = await imageCaptureObj.takePhoto();
                const imgBitmap = await createImageBitmap(blob);
                
                const cropX = Math.max(0, safePctX * imgBitmap.width);
                const cropY = Math.max(0, safePctY * imgBitmap.height);
                const cropWidth = Math.min(imgBitmap.width - cropX, safePctWidth * imgBitmap.width);
                const cropHeight = Math.min(imgBitmap.height - cropY, safePctHeight * imgBitmap.height);
                
                canvas.width = cropWidth;
                canvas.height = cropHeight;
                ctx.drawImage(imgBitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            } catch(err) {
                console.error("ImageCapture failed, falling back to video frame", err);
            }
        }
        
        if (!dataUrl) {
            // Fallback
            const cropX = safePctX * video.videoWidth;
            const cropY = safePctY * video.videoHeight;
            const cropWidth = safePctWidth * video.videoWidth;
            const cropHeight = safePctHeight * video.videoHeight;
            
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        }
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        pendingGuiaDataUrl = dataUrl;
        document.getElementById('preview-image').src = dataUrl;
        document.getElementById('camera-preview-modal').classList.remove('hidden');
        document.getElementById('camera-preview-modal').classList.add('flex');
    } catch (error) {
        console.error(error);
        showToast("Error al capturar la imagen");
    } finally {
        if (instruction) {
            instruction.innerText = origText;
            instruction.className = origClass;
        }
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
});

let pendingGuiaDataUrl = null;

document.getElementById('preview-reject-btn')?.addEventListener('click', () => {
    document.getElementById('camera-preview-modal').classList.add('hidden');
    document.getElementById('camera-preview-modal').classList.remove('flex');
    pendingGuiaDataUrl = null;
});

document.getElementById('preview-confirm-btn')?.addEventListener('click', () => {
    document.getElementById('camera-preview-modal').classList.add('hidden');
    document.getElementById('camera-preview-modal').classList.remove('flex');
    closeCameraModal();
    if (pendingGuiaDataUrl) {
        processGuiaDataUrl(pendingGuiaDataUrl, 'image/jpeg');
        pendingGuiaDataUrl = null;
    }
});

// --- UPLOAD LOGIC REFACTOR ---
async function handleGuiaUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onloadend = () => {
            processGuiaDataUrl(reader.result, file.type);
        };
        reader.readAsDataURL(file);
    } catch (err) {
        showToast("Error leyendo archivo");
        event.target.value = '';
    }
}

async function processGuiaDataUrl(dataUrl, mimeType = 'image/jpeg') {
    const btn = document.getElementById('upload-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="ph-bold ph-circle-notch animate-spin"></i> Subiendo...`;
    btn.disabled = true;

    try {
        const base64Data = dataUrl.split(',')[1];
        
        const img = new Image();
        img.onload = async () => {
            const scannedData = applyScannerFilter(img);
            const s = allServices.find(srv => srv.ID == currentServiceId);
            const cliente = s ? s.Cliente.replace(/[^a-z0-9]/gi, '_') : "Desconocido";
            const fecha = new Date().toISOString().split('T')[0];

            try {
                const response = await callAPI('uploadGuia', {
                    originalData: base64Data,
                    scannedData: scannedData,
                    mimeType: mimeType,
                    cliente: cliente,
                    fecha: fecha,
                    serviceId: currentServiceId
                });

                showToast("Guía y Escaneo guardados");
                
                if (s) {
                    s["Link Archivo"] = response.url;
                    storage.set('logipro-cache-services', JSON.stringify(allServices));
                    openDetail(currentServiceId);
                }
            } catch(e) {
                showToast("Error al procesar o subir");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                document.getElementById('file-upload-input').value = '';
            }
        };
        img.src = dataUrl;
    } catch (err) {
        showToast("Error procesando imagen");
        btn.innerHTML = originalText;
        btn.disabled = false;
        document.getElementById('file-upload-input').value = '';
    }
}

// Procesa la imagen para que parezca un documento legal escaneado (B/N de alto contraste)
function applyScannerFilter(imgElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Redimensionar si es muy grande para no agotar memoria
    let width = imgElement.width;
    let height = imgElement.height;
    const maxDim = 1920;
    if (width > maxDim || height > maxDim) {
        if (width > height) {
            height *= maxDim / width;
            width = maxDim;
        } else {
            width *= maxDim / height;
            height = maxDim;
        }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Filtro "Color Mágico" intermedio:
    // saturate(110%): Realza levemente los colores
    // brightness(108%): Punto medio para blanquear sin borrar firmas
    // contrast(120%): Look de escáner pero conservador
    ctx.filter = 'saturate(110%) brightness(108%) contrast(120%)';
    
    // Fondo blanco por si hay transparencias
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    ctx.drawImage(imgElement, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
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

// --- PWA LOGIC ---
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
const userAgent = navigator.userAgent || navigator.vendor || window.opera;
const isAndroid = /android/i.test(userAgent);
const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg fail:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
        }
    } else {
        alert("Para instalar, toca los 3 puntos de tu navegador y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
    }
});

document.getElementById('close-ios-banner')?.addEventListener('click', () => {
    const iosBanner = document.getElementById('ios-install-banner');
    if (iosBanner) {
        iosBanner.classList.add('translate-y-full');
        setTimeout(() => iosBanner.classList.add('hidden'), 500);
    }
    storage.set('logipro-ios-banner-dismissed', 'true');
});

// Enforce PWA rules on load
document.addEventListener('DOMContentLoaded', () => {
    if (!isStandalone) {
        if (isAndroid) {
            // Block Android users
            const installScreen = document.getElementById('android-install-screen');
            if (installScreen) {
                installScreen.classList.remove('hidden');
                installScreen.classList.add('flex');
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app-screen').classList.add('hidden');
            }
        } else if (isIOS) {
            // Show iOS banner
            const hasDismissed = storage.get('logipro-ios-banner-dismissed');
            if (!hasDismissed) {
                const iosBanner = document.getElementById('ios-install-banner');
                if (iosBanner) {
                    iosBanner.classList.remove('hidden');
                    // Slight delay to allow display:block to apply before animating transform
                    setTimeout(() => iosBanner.classList.remove('translate-y-full'), 100);
                }
            }
        }
    }
});
