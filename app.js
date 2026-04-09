// Data Mockup
const statsData = {
    activeServices: 12,
    pendingInvoices: 3,
    totalClients: 48
};

const servicesData = [
    { id: 'SRV-1029', type: 'Transporte de Carga', route: 'CDMX - Monterrey', status: 'En Tránsito', date: '10/04/2026' },
    { id: 'SRV-1030', type: 'Traslado Especial', route: 'Guadalajara - Tijuana', status: 'Programado', date: '12/04/2026' },
    { id: 'SRV-1031', type: 'Distribución Local', route: 'Zona Metropolitana', status: 'Completado', date: '08/04/2026' },
    { id: 'SRV-1032', type: 'Carga Peligrosa', route: 'Veracruz - Puebla', status: 'En Tránsito', date: '09/04/2026' },
];

const invoicesData = [
    { id: 'FAC-2026-001', client: 'Industrias Automotrices SA', amount: '$45,000.00', date: '01/04/2026', status: 'Pagado' },
    { id: 'FAC-2026-002', client: 'Distribuidora del Norte', amount: '$12,500.00', date: '05/04/2026', status: 'Pendiente' },
    { id: 'FAC-2026-003', client: 'Manufacturas Globales', amount: '$8,900.00', date: '07/04/2026', status: 'Pendiente' },
    { id: 'FAC-2026-004', client: 'Logística Express', amount: '$32,100.00', date: '08/04/2026', status: 'Pagado' },
];

// Views Templates
const views = {
    home: `
        <h1 class="page-title">Bienvenido, Admin User</h1>
        <p class="page-subtitle">Resumen general de operaciones logísticas.</p>
        
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Servicios Activos</h3>
                    <div class="stat-value">${statsData.activeServices}</div>
                </div>
                <div class="stat-icon blue">
                    <i class="ph ph-truck"></i>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Facturas Pendientes</h3>
                    <div class="stat-value">${statsData.pendingInvoices}</div>
                </div>
                <div class="stat-icon orange">
                    <i class="ph ph-receipt"></i>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Clientes Totales</h3>
                    <div class="stat-value">${statsData.totalClients}</div>
                </div>
                <div class="stat-icon green">
                    <i class="ph ph-users"></i>
                </div>
            </div>
        </div>

        <div class="table-container fade-in" style="animation-delay: 0.1s; animation-fill-mode: both;">
            <div class="table-header">
                <h3>Últimas Operaciones</h3>
                <button class="btn-ghost">Ver todas</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID Servicio</th>
                        <th>Tipo</th>
                        <th>Ruta</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${servicesData.slice(0, 3).map(s => `
                    <tr>
                        <td><strong>${s.id}</strong></td>
                        <td>${s.type}</td>
                        <td>${s.route}</td>
                        <td><span class="status-badge ${s.status === 'Completado' ? 'success' : s.status === 'Programado' ? 'neutral' : 'warning'}">
                            ${s.status}
                        </span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `,
    services: `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h1 class="page-title">Servicios Logísticos</h1>
                <p class="page-subtitle">Gestión y monitoreo de todos los servicios.</p>
            </div>
            <button class="btn-primary">
                <i class="ph ph-plus"></i> Nuevo Servicio
            </button>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID de Guía</th>
                        <th>Tipo de Servicio</th>
                        <th>Ruta</th>
                        <th>Fecha de Operación</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${servicesData.map(s => `
                    <tr>
                        <td><strong>${s.id}</strong></td>
                        <td>${s.type}</td>
                        <td>${s.route}</td>
                        <td>${s.date}</td>
                        <td>
                            <span class="status-badge ${s.status === 'Completado' ? 'success' : s.status === 'Programado' ? 'neutral' : 'warning'}">
                                ${s.status === 'Completado' ? '<i class="ph ph-check-circle"></i>' : s.status === 'En Tránsito' ? '<i class="ph ph-clock-countdown"></i>' : '<i class="ph ph-calendar"></i>'}
                                ${s.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn-ghost">Ver Detalle</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `,
    billing: `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h1 class="page-title">Facturita</h1>
                <p class="page-subtitle">Control de ingresos y cuentas por cobrar.</p>
            </div>
            <button class="btn-primary">
                <i class="ph ph-file-pdf"></i> Generar Reporte
            </button>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Número de Factura</th>
                        <th>Cliente</th>
                        <th>Monto</th>
                        <th>Fecha de Emisión</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoicesData.map(inv => `
                    <tr>
                        <td><strong>${inv.id}</strong></td>
                        <td>${inv.client}</td>
                        <td>${inv.amount}</td>
                        <td>${inv.date}</td>
                        <td>
                            <span class="status-badge ${inv.status === 'Pagado' ? 'success' : 'warning'}">
                                ${inv.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn-ghost">Ver Detalle</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `,
    profile: `
        <h1 class="page-title">Configuración de Perfil</h1>
        <p class="page-subtitle">Actualiza tus datos y preferencias de la empresa.</p>

        <div class="profile-card">
            <div class="profile-header">
                <img src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff&rounded=true" alt="Profile" class="profile-avatar">
                <div class="profile-header-info">
                    <h2>Admin User</h2>
                    <p>Super Administrador | Logística Express S.A.</p>
                </div>
                <button class="btn-ghost" style="margin-left: auto;">
                    <i class="ph ph-camera"></i> Cambiar Foto
                </button>
            </div>

            <form onsubmit="event.preventDefault();">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre Completo</label>
                        <input type="text" class="form-control" value="Admin User" readonly>
                    </div>
                    <div class="form-group">
                        <label>Rol Empresarial</label>
                        <input type="text" class="form-control" value="Super Administrador" readonly>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Correo Electrónico</label>
                        <input type="email" class="form-control" value="admin@logistica-express.com">
                    </div>
                    <div class="form-group">
                        <label>Teléfono de Contacto</label>
                        <input type="tel" class="form-control" value="+52 55 1234 5678">
                    </div>
                </div>
                
                <h3 style="margin: 24px 0 16px; font-size: 16px;">Datos de la Empresa</h3>
                
                <div class="form-group">
                    <label>Razón Social</label>
                    <input type="text" class="form-control" value="Logística Express y Soluciones S.A. de C.V.">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>RFC / Tax ID</label>
                        <input type="text" class="form-control" value="LOGE8908123A1">
                    </div>
                    <div class="form-group">
                        <label>Dirección Operativa</label>
                        <input type="text" class="form-control" value="Av. Transportistas 123, Zona Industrial">
                    </div>
                </div>

                <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-ghost">Cancelar</button>
                    <button class="btn-primary">Guardar Cambios</button>
                </div>
            </form>
        </div>
    `
};

// Application Logic
document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

    // Function to render view
    const renderView = (targetId) => {
        // Remove animation class momentarily to re-trigger it
        contentArea.classList.remove('fade-in');
        
        // Use a small timeout to let the browser register the class removal
        setTimeout(() => {
            if (views[targetId]) {
                contentArea.innerHTML = views[targetId];
                contentArea.classList.add('fade-in');
            } else {
                contentArea.innerHTML = '<h1 class="page-title">En construcción</h1>';
            }
        }, 10);
    };

    // Initialize with Home
    renderView('home');

    // Add click event listeners for routing
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Render corresponding view
            const target = item.getAttribute('data-target');
            renderView(target);
        });
    });
});
