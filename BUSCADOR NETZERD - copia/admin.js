/************************************************
 *  NETZERD ADMIN - SISTEMA COMPLETO V2.0
 *  Gestión de Hoteles y Micrositios
 ************************************************/

// ===== CONFIGURACIÓN FIREBASE =====
const firebaseConfig = {
    apiKey: "AIzaSyAXHyZJGeRN7NUBHNHjMOaNuQHBaknxnyk",
    authDomain: "netzerd-pms-2024.firebaseapp.com",
    projectId: "netzerd-pms-2024",
    storageBucket: "netzerd-pms-2024.appspot.com",
    messagingSenderId: "911897764897",
    appId: "1:911897764897:web:529a3b6bf6a0f9e7cf2f60"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let hoteles = [];
let micrositios = [];
let editingHotelId = null;
let editingMicrositioId = null;
let habitacionCounter = 0;

// ===== AUTENTICACIÓN =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        showLoading(true);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        document.getElementById('admin-user').textContent = currentUser.email;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        
        await inicializarPanel();
        showToast('¡Bienvenido al panel de administración!', 'success');
        
    } catch (error) {
        console.error('Error de login:', error);
        document.getElementById('login-error').textContent = 'Credenciales incorrectas';
        document.getElementById('login-error').style.display = 'block';
    } finally {
        showLoading(false);
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
        await auth.signOut();
        location.reload();
    }
});

// ===== INICIALIZAR PANEL =====
async function inicializarPanel() {
    try {
        await Promise.all([
            cargarHoteles(),
            cargarMicrositios()
        ]);
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error al inicializar panel:', error);
        showToast('Error al cargar datos', 'error');
    }
}

// ===== NAVEGACIÓN =====
function mostrarSeccion(seccion) {
    // Remover clase active de todos los botones
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    
    // Activar el botón y sección correspondiente
    document.querySelector(`[data-section="${seccion}"]`).classList.add('active');
    document.getElementById(seccion).classList.add('active');
    
    // Cargar datos específicos
    if (seccion === 'micrositios') {
        cargarMicrositios();
    } else if (seccion === 'stats') {
        actualizarEstadisticas();
    }
}

// ===== CRUD HOTELES =====
async function cargarHoteles() {
    try {
        showLoading(true);
        const snapshot = await db.collection('hoteles').orderBy('createdAt', 'desc').get();
        hoteles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderizarHoteles();
        llenarSelectHoteles();
        
    } catch (error) {
        console.error('Error al cargar hoteles:', error);
        showToast('Error al cargar hoteles', 'error');
    } finally {
        showLoading(false);
    }
}

function renderizarHoteles() {
    const container = document.getElementById('lista-hoteles');
    if (!container) return;
    
    if (hoteles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🏨 No hay hoteles registrados</h3>
                <p>Crea tu primer hotel para comenzar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = hoteles.map(hotel => {
        const tieneMicrositio = micrositios.some(m => m.hotelId === hotel.id);
        
        return `
            <div class="hotel-item">
                <div class="hotel-info">
                    <h3>${hotel.nombre}</h3>
                    <div class="hotel-meta">
                        📍 ${hotel.ciudad}, ${hotel.departamento || 'Colombia'}<br>
                        💰 ${hotel.precio || 'N/A'} | ⭐ ${hotel.rating || 'Sin rating'}<br>
                        📝 ${hotel.descripcion?.substring(0, 100) || 'Sin descripción'}...
                    </div>
                    <div class="hotel-badges">
                        ${hotel.activo !== false ? '<span class="badge badge-activo">✅ Activo</span>' : ''}
                        ${hotel.netzerd ? '<span class="badge badge-netzerd">🔥 Netzerd</span>' : ''}
                        ${tieneMicrositio ? '<span class="badge badge-micrositio">🌐 Micrositio</span>' : ''}
                    </div>
                </div>
                <div class="hotel-actions">
                    <button onclick="editarHotel('${hotel.id}')" class="btn-small btn-edit">✏️ Editar</button>
                    <button onclick="eliminarHotel('${hotel.id}')" class="btn-small btn-delete">🗑️ Eliminar</button>
                    ${!tieneMicrositio ? `<button onclick="crearMicrositioDesdHotel('${hotel.id}')" class="btn-small btn-view">🌐 Crear Micrositio</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Abrir formulario hotel
function abrirFormularioHotel(hotelId = null) {
    editingHotelId = hotelId;
    const modal = document.getElementById('modal-hotel');
    const title = document.getElementById('titulo-modal-hotel');
    const form = document.getElementById('form-hotel');
    
    if (hotelId) {
        const hotel = hoteles.find(h => h.id === hotelId);
        if (hotel) {
            title.textContent = '✏️ Editar Hotel';
            llenarFormularioHotel(hotel);
        }
    } else {
        title.textContent = '🏨 Crear Hotel';
        form.reset();
    }
    
    modal.style.display = 'block';
}

function llenarFormularioHotel(hotel) {
    document.getElementById('hotel-nombre').value = hotel.nombre || '';
    document.getElementById('hotel-slug').value = hotel.slug || '';
    document.getElementById('hotel-ciudad').value = hotel.ciudad || '';
    document.getElementById('hotel-departamento').value = hotel.departamento || '';
    document.getElementById('hotel-descripcion').value = hotel.descripcion || '';
    document.getElementById('hotel-imagen').value = hotel.imagen || '';
    document.getElementById('hotel-precio-noche').value = hotel.precioNoche || '';
    document.getElementById('hotel-precio').value = hotel.precio || '$';
    document.getElementById('hotel-netzerd').checked = hotel.netzerd || false;
    document.getElementById('hotel-activo').checked = hotel.activo !== false;
}

// Guardar hotel
document.getElementById('form-hotel').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const hotelData = {
            nombre: document.getElementById('hotel-nombre').value.trim(),
            slug: document.getElementById('hotel-slug').value.trim(),
            ciudad: document.getElementById('hotel-ciudad').value.trim(),
            departamento: document.getElementById('hotel-departamento').value.trim(),
            descripcion: document.getElementById('hotel-descripcion').value.trim(),
            imagen: document.getElementById('hotel-imagen').value.trim(),
            precioNoche: parseInt(document.getElementById('hotel-precio-noche').value) || null,
            precio: document.getElementById('hotel-precio').value,
            netzerd: document.getElementById('hotel-netzerd').checked,
            activo: document.getElementById('hotel-activo').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (editingHotelId) {
            await db.collection('hoteles').doc(editingHotelId).update(hotelData);
            showToast('Hotel actualizado correctamente', 'success');
        } else {
            hotelData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('hoteles').add(hotelData);
            showToast('Hotel creado correctamente', 'success');
        }
        
        cerrarModalHotel();
        await cargarHoteles();
        
    } catch (error) {
        console.error('Error al guardar hotel:', error);
        showToast('Error al guardar hotel', 'error');
    } finally {
        showLoading(false);
    }
});

function editarHotel(id) {
    abrirFormularioHotel(id);
}

async function eliminarHotel(id) {
    if (!confirm('¿Estás seguro de eliminar este hotel? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Eliminar micrositios asociados
        const micrositiosSnapshot = await db.collection('micrositios').where('hotelId', '==', id).get();
        const batch = db.batch();
        
        micrositiosSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Eliminar hotel
        batch.delete(db.collection('hoteles').doc(id));
        
        await batch.commit();
        
        showToast('Hotel eliminado correctamente', 'success');
        await cargarHoteles();
        await cargarMicrositios();
        
    } catch (error) {
        console.error('Error al eliminar hotel:', error);
        showToast('Error al eliminar hotel', 'error');
    } finally {
        showLoading(false);
    }
}

function cerrarModalHotel() {
    document.getElementById('modal-hotel').style.display = 'none';
    editingHotelId = null;
}

// ===== CRUD MICROSITIOS =====
async function cargarMicrositios() {
    try {
        showLoading(true);
        const snapshot = await db.collection('micrositios').orderBy('createdAt', 'desc').get();
        micrositios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderizarMicrositios();
        
    } catch (error) {
        console.error('Error al cargar micrositios:', error);
        showToast('Error al cargar micrositios', 'error');
    } finally {
        showLoading(false);
    }
}

function renderizarMicrositios() {
    const container = document.getElementById('lista-micrositios');
    if (!container) return;
    
    if (micrositios.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🌐 No hay micrositios creados</h3>
                <p>Crea tu primer micrositio vinculado a un hotel</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = micrositios.map(micro => {
        const hotel = hoteles.find(h => h.id === micro.hotelId);
        
        return `
            <div class="micrositio-item">
                <div class="micrositio-info">
                    <h3>${micro.titulo}</h3>
                    <div class="micrositio-meta">
                        🏨 Hotel: ${hotel?.nombre || 'Hotel no encontrado'}<br>
                        📱 WhatsApp: ${micro.whatsapp || 'No configurado'}<br>
                        🛏️ Habitaciones: ${micro.habitaciones?.length || 0}<br>
                        📝 ${micro.descripcion?.substring(0, 100) || 'Sin descripción'}...
                    </div>
                    <div class="hotel-badges">
                        ${micro.activo !== false ? '<span class="badge badge-activo">✅ Activo</span>' : ''}
                        <span class="badge badge-micrositio">🌐 Micrositio</span>
                    </div>
                </div>
                <div class="micrositio-actions">
                    <button onclick="editarMicrositio('${micro.id}')" class="btn-small btn-edit">✏️ Editar</button>
                    <button onclick="previsualizarMicrositio('${micro.id}')" class="btn-small btn-view">👁️ Ver</button>
                    <button onclick="eliminarMicrositio('${micro.id}')" class="btn-small btn-delete">🗑️ Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

function llenarSelectHoteles() {
    const select = document.getElementById('micro-hotel-id');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Selecciona un hotel --</option>' +
        hoteles.map(hotel => `
            <option value="${hotel.id}">${hotel.nombre} - ${hotel.ciudad}</option>
        `).join('');
}

function crearMicrositio() {
    editingMicrositioId = null;
    document.getElementById('titulo-modal-micrositio').textContent = '🌐 Crear Micrositio';
    document.getElementById('form-micrositio').reset();
    document.getElementById('habitaciones-container').innerHTML = '';
    habitacionCounter = 0;
    
    llenarSelectHoteles();
    document.getElementById('modal-micrositio').style.display = 'block';
}

function crearMicrositioDesdHotel(hotelId) {
    crearMicrositio();
    document.getElementById('micro-hotel-id').value = hotelId;
    
    const hotel = hoteles.find(h => h.id === hotelId);
    if (hotel) {
        document.getElementById('micro-titulo').value = `Micrositio ${hotel.nombre}`;
    }
}

function editarMicrositio(id) {
    const micrositio = micrositios.find(m => m.id === id);
    if (!micrositio) return;
    
    editingMicrositioId = id;
    document.getElementById('titulo-modal-micrositio').textContent = '✏️ Editar Micrositio';
    
    // Llenar formulario
    document.getElementById('micro-hotel-id').value = micrositio.hotelId || '';
    document.getElementById('micro-titulo').value = micrositio.titulo || '';
    document.getElementById('micro-descripcion').value = micrositio.descripcion || '';
    document.getElementById('micro-whatsapp').value = micrositio.whatsapp || '';
    document.getElementById('micro-email').value = micrositio.email || '';
    
    // Cargar habitaciones
    const container = document.getElementById('habitaciones-container');
    container.innerHTML = '';
    habitacionCounter = 0;
    
    if (micrositio.habitaciones) {
        micrositio.habitaciones.forEach(hab => {
            agregarHabitacion(hab);
        });
    }
    
    // Cargar servicios
    const servicios = micrositio.servicios || [];
    document.querySelectorAll('.servicios-grid input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = servicios.includes(checkbox.value);
    });
    
    llenarSelectHoteles();
    document.getElementById('modal-micrositio').style.display = 'block';
}

// Agregar habitación dinámica
function agregarHabitacion(habitacionData = {}) {
    habitacionCounter++;
    const container = document.getElementById('habitaciones-container');
    
    const habitacionDiv = document.createElement('div');
    habitacionDiv.className = 'habitacion-item';
    habitacionDiv.innerHTML = `
        <div class="habitacion-header">
            <h5>🛏️ Habitación #${habitacionCounter}</h5>
            <button type="button" onclick="eliminarHabitacion(this)" class="btn-remove-room">❌ Eliminar</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Nombre de la Habitación *</label>
                <input type="text" class="form-input hab-nombre" value="${habitacionData.nombre || ''}" required>
            </div>
            <div class="form-group">
                <label>Capacidad *</label>
                <select class="form-input hab-capacidad" required>
                    <option value="">Seleccionar</option>
                    <option value="1 persona" ${habitacionData.capacidad === '1 persona' ? 'selected' : ''}>1 persona</option>
                    <option value="2 personas" ${habitacionData.capacidad === '2 personas' ? 'selected' : ''}>2 personas</option>
                    <option value="3 personas" ${habitacionData.capacidad === '3 personas' ? 'selected' : ''}>3 personas</option>
                    <option value="4 personas" ${habitacionData.capacidad === '4 personas' ? 'selected' : ''}>4 personas</option>
                    <option value="5+ personas" ${habitacionData.capacidad === '5+ personas' ? 'selected' : ''}>5+ personas</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Precio por Noche (COP)</label>
                <input type="number" class="form-input hab-precio" value="${habitacionData.precio || ''}" min="0">
            </div>
            <div class="form-group">
                <label>Tipo de Habitación</label>
                <select class="form-input hab-tipo">
                    <option value="Habitación Privada" ${habitacionData.tipo === 'Habitación Privada' ? 'selected' : ''}>Habitación Privada</option>
                    <option value="Habitación Compartida" ${habitacionData.tipo === 'Habitación Compartida' ? 'selected' : ''}>Habitación Compartida</option>
                    <option value="Dormitorio" ${habitacionData.tipo === 'Dormitorio' ? 'selected' : ''}>Dormitorio</option>
                    <option value="Suite" ${habitacionData.tipo === 'Suite' ? 'selected' : ''}>Suite</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Descripción de la Habitación</label>
            <textarea class="form-input hab-descripcion" rows="2">${habitacionData.descripcion || ''}</textarea>
        </div>
    `;
    
    container.appendChild(habitacionDiv);
}

function eliminarHabitacion(button) {
    if (confirm('¿Eliminar esta habitación?')) {
        button.closest('.habitacion-item').remove();
    }
}

// Guardar micrositio
document.getElementById('form-micrositio').addEventListener('submit', async (e) => {
    e.preventDefault();  
    
    try {  
        showLoading(true);  
        
        // Recopilar habitaciones  
        const habitaciones = [];  
        document.querySelectorAll('.habitacion-item').forEach(item => {  
            habitaciones.push({  
                nombre: item.querySelector('.hab-nombre').value,  
                capacidad: item.querySelector('.hab-capacidad').value,  
                precio: parseInt(item.querySelector('.hab-precio').value) || null,  
                tipo: item.querySelector('.hab-tipo').value,  
                descripcion: item.querySelector('.hab-descripcion').value  
            });  
        });  
        
        // Recopilar servicios  
        const servicios = [];  
        document.querySelectorAll('.servicios-grid input[type="checkbox"]:checked').forEach(checkbox => {  
            servicios.push(checkbox.value);  
        });  
        
        const hotelId = document.getElementById('micro-hotel-id').value;  
        const hotel = hoteles.find(h => h.id === hotelId);  
        
        const micrositioData = {  
            hotelId: hotelId,  
            titulo: document.getElementById('micro-titulo').value.trim(),  
            descripcion: document.getElementById('micro-descripcion').value.trim(),  
            whatsapp: document.getElementById('micro-whatsapp').value.trim(),  
            email: document.getElementById('micro-email').value.trim(),  
            habitaciones: habitaciones,  
            servicios: servicios,  
            hotel: hotel, // Guardamos los datos del hotel también  
            activo: true,  
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()  
        };  
        
        // 🔥 GENERAR HTML DEL MICROSITIO  
        const htmlContent = generarHTMLMicrositio(micrositioData);  
        micrositioData.htmlContent = htmlContent; // Guardamos el HTML generado  
        
        if (editingMicrositioId) {  
            await db.collection('micrositios').doc(editingMicrositioId).update(micrositioData);  
            showToast('Micrositio actualizado correctamente', 'success');  
        } else {  
            micrositioData.createdAt = firebase.firestore.FieldValue.serverTimestamp();  
            await db.collection('micrositios').add(micrositioData);  
            showToast('Micrositio creado y guardado correctamente', 'success');  
        }  
        
        cerrarModalMicrositio();  
        await cargarMicrositios();  
        await cargarHoteles(); // Para actualizar badges  
        
    } catch (error) {  
        console.error('Error al guardar micrositio:', error);  
        showToast('Error al guardar micrositio', 'error');  
    } finally {  
        showLoading(false);  
    }  
}); 

async function eliminarMicrositio(id) {
    if (!confirm('¿Estás seguro de eliminar este micrositio? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showLoading(true);
        await db.collection('micrositios').doc(id).delete();
        showToast('Micrositio eliminado correctamente', 'success');
        await cargarMicrositios();
        await cargarHoteles(); // Para actualizar badges
        
    } catch (error) {
        console.error('Error al eliminar micrositio:', error);
        showToast('Error al eliminar micrositio', 'error');
    } finally {
        showLoading(false);
    }
}

function cerrarModalMicrositio() {
    document.getElementById('modal-micrositio').style.display = 'none';
    editingMicrositioId = null;
}

// ===== PREVISUALIZACIÓN =====
function previsualizarMicrositio(id = null) {
    let micrositioData;
    
    if (id) {
        micrositioData = micrositios.find(m => m.id === id);
    } else {
        // Crear desde formulario
        const habitaciones = [];
        document.querySelectorAll('.habitacion-item').forEach(item => {
            habitaciones.push({
                nombre: item.querySelector('.hab-nombre').value,
                capacidad: item.querySelector('.hab-capacidad').value,
                precio: item.querySelector('.hab-precio').value,
                tipo: item.querySelector('.hab-tipo').value,
                descripcion: item.querySelector('.hab-descripcion').value
            });
        });
        
        const servicios = [];
        document.querySelectorAll('.servicios-grid input[type="checkbox"]:checked').forEach(checkbox => {
            servicios.push(checkbox.value);
        });
        
        const hotelId = document.getElementById('micro-hotel-id').value;
        const hotel = hoteles.find(h => h.id === hotelId);
        
        micrositioData = {
            titulo: document.getElementById('micro-titulo').value,
            descripcion: document.getElementById('micro-descripcion').value,
            whatsapp: document.getElementById('micro-whatsapp').value,
            email: document.getElementById('micro-email').value,
            habitaciones: habitaciones,
            servicios: servicios,
            hotel: hotel
        };
    }
    
    if (!micrositioData) {
        showToast('Error al cargar datos del micrositio', 'error');
        return;
    }
    
    const htmlContent = generarHTMLMicrositio(micrositioData);
    const iframe = document.getElementById('preview-frame');
    iframe.srcdoc = htmlContent;
    
    document.getElementById('modal-preview').style.display = 'block';
}

function generarHTMLMicrositio(data) {
    const hotel = data.hotel || hoteles.find(h => h.id === data.hotelId) || {};
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.titulo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 0; text-align: center; }
        .header h1 { font-size: 3rem; margin-bottom: 1rem; }
        .header p { font-size: 1.2rem; opacity: 0.9; }
        .section { padding: 60px 0; }
        .section:nth-child(even) { background: #f8f9fa; }
        .section h2 { font-size: 2.5rem; margin-bottom: 2rem; text-align: center; color: #2c3e50; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
        .card { background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .card:hover { transform: translateY(-5px); }
        .card h3 { color: #667eea; margin-bottom: 1rem; font-size: 1.5rem; }
        .servicios { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .servicio { background: #e3f2fd; padding: 1rem; border-radius: 10px; text-align: center; }
        .whatsapp { background: #25d366; color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: bold; }
        .whatsapp:hover { background: #128c7e; }
        .footer { background: #2c3e50; color: white; padding: 40px 0; text-align: center; }
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .section h2 { font-size: 2rem; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>${data.titulo}</h1>
            <p>${data.descripcion || 'Bienvenido a nuestro hotel'}</p>
            ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp.replace(/[^\d]/g, '')}" class="whatsapp" target="_blank">📱 Reservar por WhatsApp</a>` : ''}
        </div>
    </header>

    ${hotel.imagen ? `
    <section class="section">
        <div class="container">
            <img src="${hotel.imagen}" alt="${hotel.nombre}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 15px;">
        </div>
    </section>
    ` : ''}

    <section class="section">
        <div class="container">
            <h2>🏨 Sobre Nosotros</h2>
            <div style="text-align: center; font-size: 1.1rem; max-width: 800px; margin: 0 auto;">
                <p><strong>📍 Ubicación:</strong> ${hotel.ciudad || 'Colombia'}</p>
                <p style="margin-top: 1rem;">${hotel.descripcion || data.descripcion || 'Disfruta de una experiencia única en nuestro hotel.'}</p>
            </div>
        </div>
    </section>

    ${data.habitaciones && data.habitaciones.length > 0 ? `
    <section class="section">
        <div class="container">
            <h2>🛏️ Nuestras Habitaciones</h2>
            <div class="grid">
                ${data.habitaciones.map(hab => `
                    <div class="card">
                        <h3>${hab.nombre}</h3>
                        <p><strong>👥 Capacidad:</strong> ${hab.capacidad}</p>
                        <p><strong>🏷️ Tipo:</strong> ${hab.tipo || 'Habitación Privada'}</p>
                        ${hab.precio ? `<p><strong>💰 Precio:</strong> $${parseInt(hab.precio).toLocaleString()} COP/noche</p>` : ''}
                        ${hab.descripcion ? `<p style="margin-top: 1rem;">${hab.descripcion}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    ${data.servicios && data.servicios.length > 0 ? `
    <section class="section">
        <div class="container">
            <h2>✨ Nuestros Servicios</h2>
            <div class="servicios">
                ${data.servicios.map(servicio => `<div class="servicio">${servicio}</div>`).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    <section class="section">
        <div class="container" style="text-align: center;">
            <h2>📞 Contáctanos</h2>
            <div style="max-width: 600px; margin: 0 auto;">
                ${data.whatsapp ? `<p style="margin: 1rem 0;"><strong>📱 WhatsApp:</strong> ${data.whatsapp}</p>` : ''}
                ${data.email ? `<p style="margin: 1rem 0;"><strong>📧 Email:</strong> ${data.email}</p>` : ''}
                <p style="margin: 2rem 0;">
                    <strong>¡Reserva ahora y vive una experiencia inolvidable!</strong>
                </p>
                ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp.replace(/[^\d]/g, '')}" class="whatsapp" target="_blank">💬 Reservar Ahora</a>` : ''}
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 ${data.titulo}. Powered by Netzerd 🔥</p>
        </div>
    </footer>
</body>
</html>
    `;
}

function descargarMicrositio() {
    const iframe = document.getElementById('preview-frame');
    const content = iframe.srcdoc;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'micrositio.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Micrositio descargado correctamente', 'success');
}

function cerrarPreview() {
    document.getElementById('modal-preview').style.display = 'none';
}

// ===== ESTADÍSTICAS =====
function actualizarEstadisticas() {
    document.getElementById('total-hotels').textContent = hoteles.length;
    document.getElementById('total-micrositios').textContent = micrositios.length;
}

// ===== UTILIDADES =====
function showLoading(show) {
    const body = document.body;
    if (show) {
        body.classList.add('loading');
    } else {
        body.classList.remove('loading');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Auto-generar slug
document.getElementById('hotel-nombre')?.addEventListener('input', (e) => {
    const slug = e.target.value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    document.getElementById('hotel-slug').value = slug;
});

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación al cargar
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('admin-user').textContent = user.email;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            inicializarPanel();
        } else {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('admin-panel').style.display = 'none';
        }
    });
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});

console.log('🔥 NETZERD ADMIN SYSTEM LOADED SUCCESSFULLY!');
async function verHotel(hotelId) {  
    try {  
        // 🔥 PRIMERO BUSCAMOS SI TIENE MICROSITIO  
        const micrositiosSnapshot = await db.collection('micrositios')  
            .where('hotelId', '==', hotelId)  
            .where('activo', '==', true)  
            .get();  
        
        if (!micrositiosSnapshot.empty) {  
            // 🌐 TIENE MICROSITIO - ABRIRLO  
            const micrositio = micrositiosSnapshot.docs[0].data();  
            abrirMicrositio(micrositio);  
        } else {  
            // 🏨 NO TIENE MICROSITIO - MOSTRAR HOTEL NORMAL  
            mostrarDetalleHotel(hotelId);  
        }  
    } catch (error) {  
        console.error('Error al verificar micrositio:', error);  
        mostrarDetalleHotel(hotelId); // Fallback al hotel normal  
    }  
}  

// 🌐 NUEVA FUNCIÓN PARA ABRIR MICROSITIO  
function abrirMicrositio(micrositio) {  
    // Crear ventana modal para el micrositio  
    const modal = document.createElement('div');  
    modal.className = 'micrositio-modal';  
    modal.style.cssText = `  
        position: fixed;  
        top: 0;  
        left: 0;  
        width: 100%;  
        height: 100%;  
        background: rgba(0,0,0,0.9);  
        z-index: 10000;  
        display: flex;  
        align-items: center;  
        justify-content: center;  
    `;  
    
    modal.innerHTML = `  
        <div style="  
            width: 95%;  
            height: 95%;  
            background: white;  
            border-radius: 20px;  
            position: relative;  
            overflow: hidden;  
        ">  
            <button onclick="cerrarMicrositio()" style="  
                position: absolute;  
                top: 20px;  
                right: 20px;  
                background: #ff4757;  
                color: white;  
                border: none;  
                width: 40px;  
                height: 40px;  
                border-radius: 50%;  
                font-size: 20px;  
                cursor: pointer;  
                z-index: 10001;  
                font-weight: bold;  
            ">×</button>  
            
            <iframe   
                src="data:text/html;charset=utf-8,${encodeURIComponent(micrositio.htmlContent)}"  
                style="width: 100%; height: 100%; border: none;"  
            ></iframe>  
        </div>  
    `;  
    
    document.body.appendChild(modal);  
    document.body.style.overflow = 'hidden'; // Bloquear scroll  
}  

// 🔥 FUNCIÓN PARA CERRAR MICROSITIO  
function cerrarMicrositio() {  
    const modal = document.querySelector('.micrositio-modal');  
    if (modal) {  
        modal.remove();  
        document.body.style.overflow = 'auto'; // Restaurar scroll  
    }  
} 