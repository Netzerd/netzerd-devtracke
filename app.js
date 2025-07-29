// Sistema de Gestión de Tareas - Netzerd DevTracker Pro
// Versión 2.0 - Sistema Completo con Base de Datos Local

// Configuración Global
const APP_CONFIG = {
    name: 'Netzerd DevTracker Pro',
    version: '2.0',
    company: 'Netzerd',
    api_url: 'https://api.netzerd.com', // URL de API para producción
    storage_prefix: 'netzerd_'
};

// Estado Global de la Aplicación
let appState = {
    currentUser: null,
    tasks: [],
    projects: [],
    team: [],
    notifications: [],
    activities: [],
    selectedTask: null,
    filters: {
        status: '',
        priority: '',
        search: ''
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Verificar si hay sesión activa
    const savedSession = localStorage.getItem(APP_CONFIG.storage_prefix + 'session');
    if (savedSession) {
        appState.currentUser = JSON.parse(savedSession);
        showDashboard();
    } else {
        showLogin();
    }
    
    // Cargar datos desde localStorage
    loadDataFromStorage();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Inicializar calendario
    initializeCalendar();
    
    // Inicializar gráficos
    initializeCharts();
}

// Sistema de Autenticación
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Task filters
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterPriority').addEventListener('change', applyFilters);
    document.getElementById('searchTasks').addEventListener('input', applyFilters);
    
    // Task form
    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Usuarios predefinidos (en un sistema real, esto vendría de una base de datos)
    const predefinedUsers = [
        {
            id: 'admin-001',
            email: 'admin@netzerd.com',
            password: 'admin123', // En producción usar contraseñas hasheadas
            name: 'Administrador',
            role: 'Administrator',
            avatar: 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff',
            permissions: ['create', 'edit', 'delete', 'admin', 'manage_users'],
            isAdmin: true
        },
        {
            id: 'team-1',
            email: 'carlos@netzerd.com',
            password: 'password123',
            name: 'Carlos Rodríguez',
            role: 'Senior Backend Developer',
            avatar: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=2563eb&color=fff',
            permissions: ['create', 'edit'],
            isAdmin: false
        },
        {
            id: 'team-2',
            email: 'ana@netzerd.com',
            password: 'password123',
            name: 'Ana García',
            role: 'Full Stack Developer',
            avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=22c55e&color=fff',
            permissions: ['create', 'edit'],
            isAdmin: false
        }
        // Puedes añadir más usuarios predefinidos aquí
    ];
    
    // Buscar usuario
    const user = predefinedUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
        appState.currentUser = user;
        localStorage.setItem(APP_CONFIG.storage_prefix + 'session', JSON.stringify(user));
        
        showDashboard();
        createNotification('Bienvenido', `Has iniciado sesión correctamente como ${user.name}`, 'success');
        
        // Cargar información basada en el rol
        if (user.isAdmin) {
            showAdminFeatures();
        } else {
            hideAdminFeatures();
        }
    } else {
        alert('Usuario o contraseña incorrectos. Inténtalo de nuevo.');
    }
}

function showAdminFeatures() {
    // Mostrar elementos solo para administradores
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'flex';
    });
    
    // Añadir sección de administración al menú
    const sidebar = document.querySelector('.sidebar-nav');
    
    // Verificar si ya existe para no duplicar
    if (!document.querySelector('[data-section="admin"]')) {
        const adminLink = document.createElement('a');
        adminLink.href = "#";
        adminLink.className = 'nav-item';
        adminLink.dataset.section = 'admin';
        adminLink.innerHTML = '<i class="fas fa-user-shield"></i> Administración';
        
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection('admin');
        });
        
        sidebar.appendChild(adminLink);
    }
    
    // Crear sección de administración si no existe
    if (!document.getElementById('adminSection')) {
        createAdminSection();
    }
}

function hideAdminFeatures() {
    // Ocultar elementos solo para administradores
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // Eliminar sección de administración del menú si existe
    const adminLink = document.querySelector('[data-section="admin"]');
    if (adminLink) {
        adminLink.remove();
    }
}

function createAdminSection() {
    // Crear sección de administración
    const mainContent = document.querySelector('.main-content');
    
    const adminSection = document.createElement('section');
    adminSection.id = 'adminSection';
    adminSection.className = 'content-section';
    
    adminSection.innerHTML = `
        <div class="section-header">
            <h1>Panel de Administración</h1>
            <div class="header-actions">
                <button class="btn-primary" onclick="showNewUserModal()">
                    <i class="fas fa-user-plus"></i> Nuevo Usuario
                </button>
                <button class="btn-secondary" onclick="exportUserData()">
                    <i class="fas fa-download"></i> Exportar Usuarios
                </button>
            </div>
        </div>
        
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="users">Gestión de Usuarios</button>
            <button class="tab-btn" data-tab="permissions">Roles y Permisos</button>
            <button class="tab-btn" data-tab="activity">Registro de Actividad</button>
        </div>
        
        <div class="tab-content active" id="usersTab">
            <div class="search-bar">
                <input type="search" id="searchUsers" placeholder="Buscar usuarios..." class="search-input">
                <select id="filterRole" class="filter-select">
                    <option value="">Todos los roles</option>
                    <option value="Administrator">Administrador</option>
                    <option value="Senior Backend Developer">Backend Senior</option>
                    <option value="Full Stack Developer">Full Stack</option>
                    <option value="Frontend Developer">Frontend</option>
                </select>
            </div>
            
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Tareas</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <!-- Usuarios se cargarán dinámicamente -->
                </tbody>
            </table>
        </div>
        
        <div class="tab-content" id="permissionsTab">
            <div class="roles-container">
                <div class="role-card">
                    <h3>Administrador</h3>
                    <p>Acceso completo al sistema</p>
                    <ul class="permissions-list">
                        <li><i class="fas fa-check"></i> Crear/editar/eliminar tareas</li>
                        <li><i class="fas fa-check"></i> Gestionar usuarios</li>
                        <li><i class="fas fa-check"></i> Gestionar proyectos</li>
                        <li><i class="fas fa-check"></i> Ver reportes</li>
                        <li><i class="fas fa-check"></i> Configuración del sistema</li>
                    </ul>
                    <button class="btn-secondary">Editar rol</button>
                </div>
                
                <div class="role-card">
                    <h3>Desarrollador</h3>
                    <p>Acceso limitado al sistema</p>
                    <ul class="permissions-list">
                        <li><i class="fas fa-check"></i> Ver tareas asignadas</li>
                        <li><i class="fas fa-check"></i> Actualizar progreso</li>
                        <li><i class="fas fa-check"></i> Añadir comentarios</li>
                        <li><i class="fas fa-times"></i> Gestionar usuarios</li>
                        <li><i class="fas fa-times"></i> Configuración del sistema</li>
                    </ul>
                    <button class="btn-secondary">Editar rol</button>
                </div>
                
                <div class="role-card add-role">
                    <div class="add-role-content">
                        <i class="fas fa-plus-circle"></i>
                        <h3>Añadir nuevo rol</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-content" id="activityTab">
            <div class="activity-filters">
                <select id="filterActivityType" class="filter-select">
                    <option value="">Todos los tipos</option>
                    <option value="login">Inicios de sesión</option>
                    <option value="user">Gestión de usuarios</option>
                    <option value="task">Gestión de tareas</option>
                </select>
                <input type="date" id="activityStartDate" class="date-input">
                <input type="date" id="activityEndDate" class="date-input">
                <button class="btn-primary" onclick="filterActivityLog()">Filtrar</button>
            </div>
            
            <div class="activity-log-container">
                <table class="activity-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody id="activityLogTableBody">
                        <!-- Actividad se cargará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    mainContent.appendChild(adminSection);
    
    // Añadir event listeners para las pestañas
    adminSection.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Desactivar todas las pestañas
            adminSection.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            adminSection.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Activar la pestaña seleccionada
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
        });
    });
    
    // Cargar usuarios en la tabla
    loadUsersTable();
    
    // Cargar registro de actividad
    loadActivityLog();
}

function logout() {
    localStorage.removeItem(APP_CONFIG.storage_prefix + 'session');
    appState.currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'flex';
    
    // Actualizar información del usuario
    document.getElementById('userName').textContent = appState.currentUser.name;
    document.getElementById('userRole').textContent = appState.currentUser.role;
    
    // Cargar datos iniciales
    loadDashboardData();
}

// Navegación
function navigateToSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Cargar datos específicos de la sección
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'calendar':
            updateCalendar();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'team':
            loadTeam();
            break;
        case 'reports':
            loadReports();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// Sistema de Gestión de Tareas
function showNewTaskModal() {
    document.getElementById('modalTitle').textContent = 'Nueva Tarea';
    document.getElementById('taskForm').reset();
    document.getElementById('taskModal').classList.add('active');
    
    // Cargar proyectos y miembros del equipo
    loadProjectsSelect();
    loadTeamSelect();
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
}

function saveTask() {
    const task = {
        id: document.getElementById('taskForm').dataset.taskId || generateId(),
        title: document.getElementById('taskTitle').value,
        type: document.getElementById('taskType').value,
        description: document.getElementById('taskDescription').value,
        project: document.getElementById('taskProject').value,
        assignee: document.getElementById('taskAssignee').value,
        priority: document.getElementById('taskPriority').value,
        deadline: document.getElementById('taskDeadline').value,
        estimation: document.getElementById('taskEstimation').value,
        tags: document.getElementById('taskTags').value.split(',').map(tag => tag.trim()),
        status: 'pending',
        progress: 0,
        createdBy: appState.currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        activities: []
    };
    
    // Añadir o actualizar tarea
    const existingIndex = appState.tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
        appState.tasks[existingIndex] = { ...appState.tasks[existingIndex], ...task };
        createActivity('task_updated', `Tarea "${task.title}" actualizada`);
    } else {
        appState.tasks.push(task);
        createActivity('task_created', `Nueva tarea "${task.title}" creada`);
        createNotification('Nueva Tarea', `Se ha creado la tarea: ${task.title}`, 'info');
    }
    
    // Guardar en localStorage
    saveDataToStorage();
    
    // Cerrar modal y actualizar vista
    closeTaskModal();
    loadTasks();
    loadDashboardData();
}

function loadTasks() {
    const filteredTasks = filterTasks(appState.tasks);
    
    // Limpiar contenedores
    ['pendingTasks', 'inProgressTasksList', 'reviewTasks', 'completedTasksList'].forEach(containerId => {
        document.getElementById(containerId).innerHTML = '';
    });
    
    // Agrupar tareas por estado
    const tasksByStatus = {
        pending: [],
        'in-progress': [],
        review: [],
        completed: []
    };
    
    filteredTasks.forEach(task => {
        tasksByStatus[task.status].push(task);
    });
    
    // Renderizar tareas en cada columna
    Object.keys(tasksByStatus).forEach(status => {
        const container = document.getElementById(getContainerIdByStatus(status));
        const tasks = tasksByStatus[status];
        
        tasks.forEach(task => {
            container.appendChild(createTaskCard(task));
        });
        
        // Actualizar contador
        const column = document.querySelector(`[data-status="${status}"]`);
        if (column) {
            column.querySelector('.task-count').textContent = tasks.length;
        }
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.onclick = () => showTaskDetail(task.id);
    
    const assignee = getTeamMember(task.assignee);
    const project = getProject(task.project);
    
    card.innerHTML = `
        <div class="task-header">
            <span class="task-title">${task.title}</span>
            <span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
        </div>
        <div class="task-meta">
            <i class="fas fa-user"></i> ${assignee ? assignee.name : 'Sin asignar'}
            <i class="fas fa-clock"></i> ${formatDate(task.deadline)}
        </div>
        <div class="task-meta">
            <i class="fas fa-project-diagram"></i> ${project ? project.name : 'Sin proyecto'}
        </div>
        <div class="task-tags">
            ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
        </div>
        ${task.progress > 0 ? `
        <div class="task-progress">
            <div class="progress-bar-mini">
                <div class="progress-fill" style="width: ${task.progress}%"></div>
            </div>
            <span class="progress-text-mini">${task.progress}%</span>
        </div>
        ` : ''}
    `;
    
    return card;
}

function showTaskDetail(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    appState.selectedTask = task;
    
    // Actualizar información detallada
    document.getElementById('detailModalTitle').textContent = task.title;
    
    const assignee = getTeamMember(task.assignee);
    const project = getProject(task.project);
    const creator = getTeamMember(task.createdBy);
    
    document.getElementById('taskDetailInfo').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Tipo:</span>
            <span>${getTaskTypeLabel(task.type)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Descripción:</span>
            <span>${task.description}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Proyecto:</span>
            <span>${project ? project.name : 'Sin proyecto'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Asignado a:</span>
            <span>${assignee ? assignee.name : 'Sin asignar'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Prioridad:</span>
            <span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Estado:</span>
            <span>${getStatusLabel(task.status)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha límite:</span>
            <span>${formatDate(task.deadline)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Estimación:</span>
            <span>${task.estimation} horas</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Creado por:</span>
            <span>${creator ? creator.name : 'Sistema'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha creación:</span>
            <span>${formatDate(task.createdAt)}</span>
        </div>
    `;
    
    // Actualizar progreso
    document.getElementById('taskProgressBar').style.width = task.progress + '%';
    document.getElementById('taskProgressText').textContent = task.progress + '%';
    document.getElementById('progressSlider').value = task.progress;
    
    // Cargar comentarios
    loadTaskComments(task);
    
    // Cargar actividades
    loadTaskActivities(task);
    
    // Mostrar modal
    document.getElementById('taskDetailModal').classList.add('active');
}

function closeTaskDetailModal() {
    document.getElementById('taskDetailModal').classList.remove('active');
}

function updateTaskProgress(value) {
    if (!appState.selectedTask) return;
    
    const task = appState.tasks.find(t => t.id === appState.selectedTask.id);
    if (task) {
        task.progress = parseInt(value);
        task.updatedAt = new Date().toISOString();
        
        // Actualizar UI
        document.getElementById('taskProgressBar').style.width = value + '%';
        document.getElementById('taskProgressText').textContent = value + '%';
        
        // Cambiar estado automáticamente si llega al 100%
        if (task.progress === 100 && task.status !== 'completed') {
            task.status = 'review';
            createActivity('task_progress', `Tarea "${task.title}" marcada para revisión`);
        }
        
        // Guardar cambios
        saveDataToStorage();
        loadTasks();
        
        // Crear actividad
        addTaskActivity(task.id, 'progress_updated', `Progreso actualizado a ${value}%`);
    }
}

function addComment() {
    const commentText = document.getElementById('newComment').value.trim();
    if (!commentText || !appState.selectedTask) return;
    
    const comment = {
        id: generateId(),
        text: commentText,
        author: appState.currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    const task = appState.tasks.find(t => t.id === appState.selectedTask.id);
    if (task) {
        task.comments.push(comment);
        task.updatedAt = new Date().toISOString();
        
        // Limpiar campo
        document.getElementById('newComment').value = '';
        
        // Recargar comentarios
        loadTaskComments(task);
        
        // Guardar cambios
        saveDataToStorage();
        
        // Crear actividad
        addTaskActivity(task.id, 'comment_added', 'Nuevo comentario añadido');
        
        // Notificar al asignado si no es el autor del comentario
        if (task.assignee !== appState.currentUser.id) {
            createNotification(
                'Nuevo comentario',
                `${appState.currentUser.name} ha comentado en "${task.title}"`,
                'comment',
                task.assignee
            );
        }
    }
}

function loadTaskComments(task) {
    const container = document.getElementById('commentsList');
    container.innerHTML = '';
    
    task.comments.forEach(comment => {
        const author = getTeamMember(comment.author) || appState.currentUser;
        
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.innerHTML = `
            <img src="${author.avatar}" alt="${author.name}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${author.name}</span>
                    <span class="comment-time">${formatRelativeTime(comment.createdAt)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `;
        
        container.appendChild(commentEl);
    });
}

function loadTaskActivities(task) {
    const container = document.getElementById('taskActivityLog');
    container.innerHTML = '';
    
    const activities = task.activities || [];
    activities.forEach(activity => {
        const activityEl = document.createElement('div');
        activityEl.className = 'activity-entry';
        activityEl.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-text">${activity.description}</div>
            <div class="activity-time">${formatRelativeTime(activity.timestamp)}</div>
        `;
        
        container.appendChild(activityEl);
    });
}

// Dashboard
function loadDashboardData() {
    // Calcular estadísticas
    const stats = calculateTaskStats();
    
    // Actualizar contadores
    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('completedTasks').textContent = stats.completed;
    document.getElementById('inProgressTasks').textContent = stats.inProgress;
    document.getElementById('overdueTasks').textContent = stats.overdue;
    
    // Cargar actividad reciente
    loadRecentActivity();
    
    // Actualizar gráficos
    updateCharts();
    
    // Actualizar contador de notificaciones
    updateNotificationBadge();
}

function calculateTaskStats() {
    const now = new Date();
    
    return {
        total: appState.tasks.length,
        completed: appState.tasks.filter(t => t.status === 'completed').length,
        inProgress: appState.tasks.filter(t => t.status === 'in-progress').length,
        overdue: appState.tasks.filter(t => {
            return t.status !== 'completed' && new Date(t.deadline) < now;
        }).length
    };
}

function loadRecentActivity() {
    const container = document.getElementById('activityTimeline');
    container.innerHTML = '';
    
    // Obtener las últimas 10 actividades
    const recentActivities = appState.activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    recentActivities.forEach(activity => {
        const activityEl = document.createElement('div');
        activityEl.className = 'timeline-item';
        activityEl.innerHTML = `
            <div class="timeline-icon bg-${getActivityColor(activity.type)}">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-title">${activity.description}</div>
                <div class="timeline-meta">
                    <i class="fas fa-user"></i> ${activity.user}
                    <i class="fas fa-clock"></i> ${formatRelativeTime(activity.timestamp)}
                </div>
            </div>
        `;
        
        container.appendChild(activityEl);
    });
}

// Calendario
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    if (typeof FullCalendar !== 'undefined') {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: function(fetchInfo, successCallback, failureCallback) {
                // Convertir tareas a eventos del calendario
                const events = appState.tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    start: task.deadline,
                    backgroundColor: getPriorityColor(task.priority),
                    borderColor: getPriorityColor(task.priority),
                    extendedProps: {
                        task: task
                    }
                }));
                
                successCallback(events);
            },
            eventClick: function(info) {
                showTaskDetail(info.event.id);
            }
        });
        
        // Guardar instancia del calendario
        window.calendarInstance = calendar;
    }
}

function updateCalendar() {
    if (window.calendarInstance) {
        window.calendarInstance.render();
        window.calendarInstance.refetchEvents();
    }
}

function calendarView(view) {
    if (window.calendarInstance) {
        window.calendarInstance.changeView(view === 'month' ? 'dayGridMonth' : 
                                         view === 'week' ? 'timeGridWeek' : 
                                         'timeGridDay');
    }
}

// Gráficos
function initializeCharts() {
    // Gráfico de progreso mensual
    const monthlyCtx = document.getElementById('monthlyProgress');
    if (monthlyCtx) {
        window.monthlyChart = new Chart(monthlyCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tareas Completadas',
                    data: [],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Gráfico de distribución por tipo
    const distributionCtx = document.getElementById('taskDistribution');
    if (distributionCtx) {
        window.distributionChart = new Chart(distributionCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#2563eb',
                        '#22c55e',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#06b6d4'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function updateCharts() {
    // Actualizar gráfico mensual
    if (window.monthlyChart) {
        const monthlyData = calculateMonthlyProgress();
        window.monthlyChart.data.labels = monthlyData.labels;
        window.monthlyChart.data.datasets[0].data = monthlyData.data;
        window.monthlyChart.update();
    }
    
    // Actualizar gráfico de distribución
    if (window.distributionChart) {
        const distributionData = calculateTaskDistribution();
        window.distributionChart.data.labels = distributionData.labels;
        window.distributionChart.data.datasets[0].data = distributionData.data;
        window.distributionChart.update();
    }
}

function calculateMonthlyProgress() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    const labels = [];
    const data = [];
    
    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        labels.push(months[monthIndex]);
        
        // Contar tareas completadas en ese mes
        const completedInMonth = appState.tasks.filter(task => {
            if (task.status !== 'completed') return false;
            const taskMonth = new Date(task.updatedAt).getMonth();
            return taskMonth === monthIndex;
        }).length;
        
        data.push(completedInMonth);
    }
    
    return { labels, data };
}

function calculateTaskDistribution() {
    const types = {
        feature: 'Funcionalidades',
        bug: 'Bugs',
        refactor: 'Refactorización',
        testing: 'Testing',
        documentation: 'Documentación',
        deployment: 'Despliegue'
    };
    
    const labels = [];
    const data = [];
    
    Object.keys(types).forEach(type => {
        const count = appState.tasks.filter(task => task.type === type).length;
        if (count > 0) {
            labels.push(types[type]);
            data.push(count);
        }
    });
    
    return { labels, data };
}

// Proyectos
function loadProjects() {
    const container = document.getElementById('projectsGrid');
    container.innerHTML = '';
    
    appState.projects.forEach(project => {
        container.appendChild(createProjectCard(project));
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    // Calcular progreso del proyecto
    const projectTasks = appState.tasks.filter(t => t.project === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
    
    card.innerHTML = `
        <div class="project-header">
            <h3>${project.name}</h3>
            <span class="project-status">${project.status}</span>
        </div>
        <p>${project.description}</p>
        <div class="project-progress">
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${progress}% completado</span>
        </div>
        <div class="project-meta">
            <span><i class="fas fa-tasks"></i> ${projectTasks.length} tareas</span>
            <span><i class="fas fa-calendar"></i> ${formatDate(project.deadline)}</span>
        </div>
        <div class="project-team">
            <span>Equipo:</span>
            <div class="team-avatars">
                ${project.team.slice(0, 3).map(memberId => {
                    const member = getTeamMember(memberId);
                    return member ? `<img src="${member.avatar}" alt="${member.name}" class="team-avatar" title="${member.name}">` : '';
                }).join('')}
                ${project.team.length > 3 ? `<span class="more-members">+${project.team.length - 3}</span>` : ''}
            </div>
        </div>
    `;
    
    return card;
}

function showNewProjectModal() {
    // Implementar modal de nuevo proyecto
    alert('Modal de nuevo proyecto - Por implementar');
}

// Equipo
function loadTeam() {
    const container = document.getElementById('teamGrid');
    container.innerHTML = '';
    
    appState.team.forEach(member => {
        container.appendChild(createTeamMemberCard(member));
    });
}

function createTeamMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'team-member-card';
    
    // Calcular estadísticas del miembro
    const memberTasks = appState.tasks.filter(t => t.assignee === member.id);
    const completedTasks = memberTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = memberTasks.filter(t => t.status === 'in-progress').length;
    
    card.innerHTML = `
        <img src="${member.avatar}" alt="${member.name}" class="member-avatar">
        <h3 class="member-name">${member.name}</h3>
        <p class="member-role">${member.role}</p>
        <div class="member-skills">
            ${member.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
        <div class="member-stats">
            <div class="member-stat">
                <span class="stat-value">${memberTasks.length}</span>
                <span class="stat-label">Total</span>
            </div>
            <div class="member-stat">
                <span class="stat-value">${inProgressTasks}</span>
                <span class="stat-label">En progreso</span>
            </div>
            <div class="member-stat">
                <span class="stat-value">${completedTasks}</span>
                <span class="stat-label">Completadas</span>
            </div>
        </div>
    `;
    
    return card;
}

// Reportes
function loadReports() {
    generateReport();
}

function generateReport() {
    const startDate = document.getElementById('reportStartDate').value || 
                     new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = document.getElementById('reportEndDate').value || 
                   new Date().toISOString().split('T')[0];
    
    const container = document.getElementById('reportContent');
    
    // Filtrar tareas por rango de fechas
    const tasksInRange = appState.tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= new Date(startDate) && taskDate <= new Date(endDate);
    });
    
    // Generar métricas
    const metrics = {
        totalTasks: tasksInRange.length,
        completedTasks: tasksInRange.filter(t => t.status === 'completed').length,
        averageCompletionTime: calculateAverageCompletionTime(tasksInRange),
        tasksByPriority: {
            high: tasksInRange.filter(t => t.priority === 'high').length,
            medium: tasksInRange.filter(t => t.priority === 'medium').length,
            low: tasksInRange.filter(t => t.priority === 'low').length
        },
        tasksByType: {},
        teamPerformance: []
    };
    
    // Tareas por tipo
    ['feature', 'bug', 'refactor', 'testing', 'documentation', 'deployment'].forEach(type => {
        metrics.tasksByType[type] = tasksInRange.filter(t => t.type === type).length;
    });
    
    // Rendimiento del equipo
    appState.team.forEach(member => {
        const memberTasks = tasksInRange.filter(t => t.assignee === member.id);
        metrics.teamPerformance.push({
            name: member.name,
            total: memberTasks.length,
            completed: memberTasks.filter(t => t.status === 'completed').length,
            efficiency: memberTasks.length > 0 ? 
                       Math.round((memberTasks.filter(t => t.status === 'completed').length / memberTasks.length) * 100) : 0
        });
    });
    
    // Renderizar reporte
    container.innerHTML = `
        <div class="report-header">
            <h2>Reporte de Rendimiento</h2>
            <p>Período: ${formatDate(startDate)} - ${formatDate(endDate)}</p>
        </div>
        
        <div class="report-summary">
            <div class="summary-card">
                <h3>${metrics.totalTasks}</h3>
                <p>Tareas Totales</p>
            </div>
            <div class="summary-card">
                <h3>${metrics.completedTasks}</h3>
                <p>Tareas Completadas</p>
            </div>
            <div class="summary-card">
                <h3>${metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 0}%</h3>
                <p>Tasa de Finalización</p>
            </div>
            <div class="summary-card">
                <h3>${metrics.averageCompletionTime}</h3>
                <p>Tiempo Promedio (días)</p>
            </div>
        </div>
        
        <div class="report-section">
            <h3>Distribución por Prioridad</h3>
            <div class="priority-breakdown">
                <div class="priority-item">
                    <span class="priority-label">Alta:</span>
                    <span class="priority-value">${metrics.tasksByPriority.high}</span>
                </div>
                <div class="priority-item">
                    <span class="priority-label">Media:</span>
                    <span class="priority-value">${metrics.tasksByPriority.medium}</span>
                </div>
                <div class="priority-item">
                    <span class="priority-label">Baja:</span>
                    <span class="priority-value">${metrics.tasksByPriority.low}</span>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>Rendimiento del Equipo</h3>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>Miembro</th>
                        <th>Tareas Asignadas</th>
                        <th>Completadas</th>
                        <th>Eficiencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.teamPerformance.map(member => `
                        <tr>
                            <td>${member.name}</td>
                            <td>${member.total}</td>
                            <td>${member.completed}</td>
                            <td>${member.efficiency}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="report-actions">
            <button class="btn-primary" onclick="exportReport('pdf')">
                <i class="fas fa-file-pdf"></i> Exportar PDF
            </button>
            <button class="btn-secondary" onclick="exportReport('excel')">
                <i class="fas fa-file-excel"></i> Exportar Excel
            </button>
            <button class="btn-secondary" onclick="window.print()">
                <i class="fas fa-print"></i> Imprimir
            </button>
        </div>
    `;
}

function calculateAverageCompletionTime(tasks) {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    if (completedTasks.length === 0) return 0;
    
    let totalDays = 0;
    completedTasks.forEach(task => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.updatedAt);
        const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
        totalDays += days;
    });
    
    return Math.round(totalDays / completedTasks.length);
}

// Notificaciones
function loadNotifications() {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '';
    
    const userNotifications = appState.notifications
        .filter(n => !n.targetUser || n.targetUser === appState.currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    userNotifications.forEach(notification => {
        container.appendChild(createNotificationItem(notification));
    });
    
    updateNotificationBadge();
}

function createNotificationItem(notification) {
    const item = document.createElement('div');
    item.className = `notification-item ${notification.read ? '' : 'unread'}`;
    item.onclick = () => markNotificationAsRead(notification.id);
    
    item.innerHTML = `
        <div class="notification-icon bg-${getNotificationColor(notification.type)}">
            <i class="fas ${getNotificationIcon(notification.type)}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatRelativeTime(notification.timestamp)}</div>
        </div>
    `;
    
    return item;
}

function createNotification(title, message, type, targetUser = null) {
    const notification = {
        id: generateId(),
        title: title,
        message: message,
        type: type,
        targetUser: targetUser,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    appState.notifications.push(notification);
    saveDataToStorage();
    updateNotificationBadge();
}

function markNotificationAsRead(notificationId) {
    const notification = appState.notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        saveDataToStorage();
        loadNotifications();
    }
}

function markAllAsRead() {
    appState.notifications.forEach(n => {
        if (!n.targetUser || n.targetUser === appState.currentUser.id) {
            n.read = true;
        }
    });
    saveDataToStorage();
    loadNotifications();
}

function updateNotificationBadge() {
    const unreadCount = appState.notifications.filter(n => 
        !n.read && (!n.targetUser || n.targetUser === appState.currentUser.id)
    ).length;
    
    const badge = document.getElementById('notifBadge');
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

// Utilidades
function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`;
    
    return formatDate(dateString);
}

function getTaskTypeLabel(type) {
    const labels = {
        feature: 'Nueva Funcionalidad',
        bug: 'Corrección de Bug',
        refactor: 'Refactorización',
        testing: 'Testing',
        documentation: 'Documentación',
        deployment: 'Despliegue'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Pendiente',
        'in-progress': 'En Progreso',
        review: 'En Revisión',
        completed: 'Completado'
    };
    return labels[status] || status;
}

function getContainerIdByStatus(status) {
    const containers = {
        pending: 'pendingTasks',
        'in-progress': 'inProgressTasksList',
        review: 'reviewTasks',
        completed: 'completedTasksList'
    };
    return containers[status];
}

function getPriorityColor(priority) {
    const colors = {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#22c55e'
    };
    return colors[priority] || '#64748b';
}

function getActivityIcon(type) {
    const icons = {
        task_created: 'fa-plus-circle',
        task_updated: 'fa-edit',
        task_completed: 'fa-check-circle',
        comment_added: 'fa-comment',
        progress_updated: 'fa-tasks',
        user_assigned: 'fa-user-plus'
    };
    return icons[type] || 'fa-info-circle';
}

function getActivityColor(type) {
    const colors = {
        task_created: 'primary',
        task_updated: 'warning',
        task_completed: 'success',
        comment_added: 'secondary',
        progress_updated: 'primary',
        user_assigned: 'primary'
    };
    return colors[type] || 'secondary';
}

function getNotificationIcon(type) {
    const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        comment: 'fa-comment',
        task: 'fa-tasks'
    };
    return icons[type] || 'fa-bell';
}

function getNotificationColor(type) {
    const colors = {
        info: 'primary',
        success: 'success',
        warning: 'warning',
        error: 'danger',
        comment: 'secondary',
        task: 'primary'
    };
    return colors[type] || 'secondary';
}

function getTeamMember(memberId) {
    return appState.team.find(m => m.id === memberId);
}

function getProject(projectId) {
    return appState.projects.find(p => p.id === projectId);
}

// Filtros
function applyFilters() {
    appState.filters = {
        status: document.getElementById('filterStatus').value,
        priority: document.getElementById('filterPriority').value,
        search: document.getElementById('searchTasks').value.toLowerCase()
    };
    
    loadTasks();
}

function filterTasks(tasks) {
    return tasks.filter(task => {
        // Filtro por estado
        if (appState.filters.status && task.status !== appState.filters.status) {
            return false;
        }
        
        // Filtro por prioridad
        if (appState.filters.priority && task.priority !== appState.filters.priority) {
            return false;
        }
        
        // Filtro por búsqueda
        if (appState.filters.search) {
            const searchTerm = appState.filters.search;
            const matchTitle = task.title.toLowerCase().includes(searchTerm);
            const matchDescription = task.description.toLowerCase().includes(searchTerm);
            const matchTags = task.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            
            if (!matchTitle && !matchDescription && !matchTags) {
                return false;
            }
        }
        
        return true;
    });
}

// Actividades
function createActivity(type, description) {
    const activity = {
        id: generateId(),
        type: type,
        description: description,
        user: appState.currentUser.name,
        timestamp: new Date().toISOString()
    };
    
    appState.activities.push(activity);
    
    // Mantener solo las últimas 100 actividades
    if (appState.activities.length > 100) {
        appState.activities = appState.activities.slice(-100);
    }
    
    saveDataToStorage();
}

function addTaskActivity(taskId, type, description) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        if (!task.activities) {
            task.activities = [];
        }
        
        task.activities.push({
            type: type,
            description: description,
            timestamp: new Date().toISOString()
        });
        
        saveDataToStorage();
    }
}

// Almacenamiento Local
function saveDataToStorage() {
    localStorage.setItem(APP_CONFIG.storage_prefix + 'tasks', JSON.stringify(appState.tasks));
    localStorage.setItem(APP_CONFIG.storage_prefix + 'projects', JSON.stringify(appState.projects));
    localStorage.setItem(APP_CONFIG.storage_prefix + 'team', JSON.stringify(appState.team));
    localStorage.setItem(APP_CONFIG.storage_prefix + 'notifications', JSON.stringify(appState.notifications));
    localStorage.setItem(APP_CONFIG.storage_prefix + 'activities', JSON.stringify(appState.activities));
}

function loadDataFromStorage() {
    // Cargar tareas
    const savedTasks = localStorage.getItem(APP_CONFIG.storage_prefix + 'tasks');
    if (savedTasks) {
        appState.tasks = JSON.parse(savedTasks);
    } else {
        // Datos de ejemplo
        appState.tasks = generateSampleTasks();
    }
    
    // Cargar proyectos
    const savedProjects = localStorage.getItem(APP_CONFIG.storage_prefix + 'projects');
    if (savedProjects) {
        appState.projects = JSON.parse(savedProjects);
    } else {
        appState.projects = generateSampleProjects();
    }
    
    // Cargar equipo
    const savedTeam = localStorage.getItem(APP_CONFIG.storage_prefix + 'team');
    if (savedTeam) {
        appState.team = JSON.parse(savedTeam);
    } else {
        appState.team = generateSampleTeam();
    }
    
    // Cargar notificaciones
    const savedNotifications = localStorage.getItem(APP_CONFIG.storage_prefix + 'notifications');
    if (savedNotifications) {
        appState.notifications = JSON.parse(savedNotifications);
    }
    
    // Cargar actividades
    const savedActivities = localStorage.getItem(APP_CONFIG.storage_prefix + 'activities');
    if (savedActivities) {
        appState.activities = JSON.parse(savedActivities);
    }
}

// Datos de ejemplo
function generateSampleTasks() {
    return [
        {
            id: generateId(),
            title: 'Implementar API REST para autenticación',
            type: 'feature',
            description: 'Crear endpoints para login, registro y gestión de tokens JWT',
            project: 'proj-1',
            assignee: 'team-1',
            priority: 'high',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            estimation: 16,
            tags: ['backend', 'api', 'security'],
            status: 'in-progress',
            progress: 60,
            createdBy: 'system',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            activities: []
        },
        {
            id: generateId(),
            title: 'Optimizar consultas de base de datos',
            type: 'refactor',
            description: 'Mejorar el rendimiento de las consultas más utilizadas añadiendo índices',
            project: 'proj-1',
            assignee: 'team-2',
            priority: 'medium',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            estimation: 8,
            tags: ['backend', 'database', 'performance'],
            status: 'pending',
            progress: 0,
            createdBy: 'system',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            activities: []
        },
        {
            id: generateId(),
            title: 'Corregir bug en validación de formularios',
            type: 'bug',
            description: 'Los formularios no validan correctamente los campos de email',
            project: 'proj-2',
            assignee: 'team-3',
            priority: 'high',
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            estimation: 4,
            tags: ['frontend', 'validation', 'bug-fix'],
            status: 'review',
            progress: 90,
            createdBy: 'system',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            activities: []
        }
    ];
}

function generateSampleProjects() {
    return [
        {
            id: 'proj-1',
            name: 'Sistema de Gestión Principal',
            description: 'Desarrollo del sistema core de la empresa',
            status: 'active',
            deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            team: ['team-1', 'team-2', 'team-3'],
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'proj-2',
            name: 'App Mobile',
            description: 'Aplicación móvil para clientes',
            status: 'active',
            deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            team: ['team-3', 'team-4'],
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'proj-3',
            name: 'Migración a Cloud',
            description: 'Migración de infraestructura a AWS',
            status: 'planning',
            deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
            team: ['team-1', 'team-5'],
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
}

function generateSampleTeam() {
    return [
        {
            id: 'team-1',
            name: 'Carlos Rodríguez',
            email: 'carlos@netzerd.com',
            role: 'Senior Backend Developer',
            avatar: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=2563eb&color=fff',
            skills: ['Node.js', 'Python', 'MongoDB', 'AWS']
        },
        {
            id: 'team-2',
            name: 'Ana García',
            email: 'ana@netzerd.com',
            role: 'Full Stack Developer',
            avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=22c55e&color=fff',
            skills: ['React', 'Node.js', 'PostgreSQL', 'Docker']
        },
        {
            id: 'team-3',
            name: 'Luis Martínez',
            email: 'luis@netzerd.com',
            role: 'Frontend Developer',
            avatar: 'https://ui-avatars.com/api/?name=Luis+Martinez&background=f59e0b&color=fff',
            skills: ['React', 'Vue.js', 'TypeScript', 'CSS']
        },
        {
            id: 'team-4',
            name: 'María López',
            email: 'maria@netzerd.com',
            role: 'Mobile Developer',
            avatar: 'https://ui-avatars.com/api/?name=Maria+Lopez&background=ef4444&color=fff',
            skills: ['React Native', 'Flutter', 'iOS', 'Android']
        },
        {
            id: 'team-5',
            name: 'Pedro Sánchez',
            email: 'pedro@netzerd.com',
            role: 'DevOps Engineer',
            avatar: 'https://ui-avatars.com/api/?name=Pedro+Sanchez&background=8b5cf6&color=fff',
            skills: ['AWS', 'Kubernetes', 'CI/CD', 'Terraform']
        }
    ];
}

// Exportación de datos
function exportData() {
    const data = {
        tasks: appState.tasks,
        projects: appState.projects,
        team: appState.team,
        exportDate: new Date().toISOString(),
        exportedBy: appState.currentUser.name
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netzerd-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    createNotification('Exportación Exitosa', 'Los datos han sido exportados correctamente', 'success');
}

function exportReport(format) {
    // Implementación simplificada
    if (format === 'pdf') {
        window.print();
    } else if (format === 'excel') {
        // En producción, usar una librería como SheetJS
        alert('Exportación a Excel - Funcionalidad por implementar con SheetJS');
    }
}

// Funciones auxiliares para los selectores
function loadProjectsSelect() {
    const select = document.getElementById('taskProject');
    select.innerHTML = '<option value="">Seleccionar proyecto</option>';
    
    appState.projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });
}

function loadTeamSelect() {
    const select = document.getElementById('taskAssignee');
    select.innerHTML = '<option value="">Seleccionar desarrollador</option>';
    
    appState.team.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.name} - ${member.role}`;
        select.appendChild(option);
    });
}

// Estilos adicionales para elementos dinámicos
const additionalStyles = `
<style>
/* Estilos adicionales para mejorar la experiencia */
.skill-tag {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin: 0.125rem;
}

.more-members {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #64748b;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    margin-left: -10px;
}

.progress-bar-mini {
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    margin-top: 0.5rem;
    position: relative;
}

.progress-fill {
    height: 100%;
    background: var(--primary-color);
    border-radius: 2px;
    transition: width 0.3s ease;
}

.progress-text-mini {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-left: 0.5rem;
}

.report-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
}

.summary-card {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 0.5rem;
    text-align: center;
}

.summary-card h3 {
    font-size: 2rem;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.priority-breakdown {
    display: flex;
    gap: 2rem;
    margin: 1rem 0;
}

.priority-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.performance-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.performance-table th,
.performance-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.performance-table th {
    background: #f8fafc;
    font-weight: 600;
}

.report-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-color);
}

/* Animaciones mejoradas */
.task-card {
    animation: slideIn 0.3s ease-out;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(37, 99, 235, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
    }
}

.notification-item.unread .notification-icon {
    animation: pulse 2s infinite;
}

/* Modo oscuro (opcional) */
@media (prefers-color-scheme: dark) {
    :root {
        --card-bg: #1e293b;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --border-color: #334155;
    }
    
    body {
        background-color: var(--dark-bg);
    }
}
</style>
`;

// Inyectar estilos adicionales
document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Función para simular actualizaciones en tiempo real
// Reemplazar la función startRealTimeUpdates
function startRealTimeUpdates() {
    // Ya no generaremos notificaciones aleatorias
    console.log('Sistema de notificaciones en tiempo real iniciado');
    
    // En su lugar, configuramos una verificación periódica de tareas cercanas a su fecha límite
    setInterval(checkDeadlines, 60000); // Verificar cada minuto
}

// Añadir función para verificar fechas límite de tareas
function checkDeadlines() {
    if (!appState.currentUser) return;
    
    const now = new Date();
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);
    
    // Buscar tareas asignadas al usuario actual que vencen pronto
    const tasksAboutToExpire = appState.tasks.filter(task => {
        if (task.assignee !== appState.currentUser.id) return false;
        if (task.status === 'completed') return false;
        
        const deadline = new Date(task.deadline);
        return deadline > now && deadline < oneDayFromNow;
    });
    
    // Notificar sobre tareas que vencen pronto y que no han sido notificadas recientemente
    tasksAboutToExpire.forEach(task => {
        const lastNotification = appState.notifications.find(n => 
            n.type === 'deadline' && 
            n.relatedId === task.id &&
            new Date(n.timestamp) > new Date(Date.now() - 12 * 60 * 60 * 1000) // En las últimas 12 horas
        );
        
        if (!lastNotification) {
            createNotification(
                'Tarea próxima a vencer',
                `La tarea "${task.title}" vence en menos de 24 horas`,
                'deadline',
                appState.currentUser.id,
                task.id
            );
        }
    });
    
    // Verificar tareas vencidas
    const overdueFilter = document.getElementById('overdueFilter');
    if (overdueFilter) {
        const overdueCount = appState.tasks.filter(t => 
            t.assignee === appState.currentUser.id && 
            t.status !== 'completed' && 
            new Date(t.deadline) < now
        ).length;
        
        overdueFilter.querySelector('.filter-count').textContent = overdueCount;
    }
}

// Modificar la función createNotification
function createNotification(title, message, type, targetUser = null, relatedId = null) {
    const notification = {
        id: generateId(),
        title: title,
        message: message,
        type: type,
        targetUser: targetUser,
        relatedId: relatedId,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    appState.notifications.push(notification);
    
    // Limitar a 100 notificaciones para no sobrecargar localStorage
    if (appState.notifications.length > 100) {
        // Mantener las notificaciones no leídas y las más recientes
        const unreadNotifications = appState.notifications.filter(n => !n.read);
        const readNotifications = appState.notifications.filter(n => n.read)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100 - unreadNotifications.length);
        
        appState.notifications = [...unreadNotifications, ...readNotifications];
    }
    
    saveDataToStorage();
    updateNotificationBadge();
    
    // Si el usuario está viendo la sección de notificaciones, actualizar
    if (document.getElementById('notificationsSection').classList.contains('active')) {
        loadNotifications();
    }
    
    // Mostrar notificación en pantalla si es para el usuario actual
    if (!targetUser || targetUser === appState.currentUser.id) {
        showToast(title, message, type);
    }
}

// Añadir función para mostrar notificaciones en pantalla
function showToast(title, message, type) {
    // Crear elemento de notificación
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${getNotificationIcon(type)}"></i>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Añadir al DOM
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        // Crear contenedor si no existe
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        container.appendChild(toast);
    } else {
        toastContainer.appendChild(toast);
    }
    
    // Configurar cierre automático
    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
    
    // Evento para cerrar manualmente
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
}

// Gestión de usuarios
function showNewUserModal() {
    document.getElementById('userModalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('userForm').reset();
    document.getElementById('userForm').dataset.userId = '';
    
    // Por defecto, habilitar la creación y edición de tareas
    document.getElementById('permCreate').checked = true;
    document.getElementById('permEdit').checked = true;
    
    document.getElementById('userModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

function loadUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Combinar usuarios predefinidos y del equipo
    const allUsers = [...appState.team];
    
    // Añadir el usuario admin si no está ya incluido
    if (!allUsers.find(u => u.id === 'admin-001')) {
        allUsers.push({
            id: 'admin-001',
            name: 'Administrador',
            email: 'admin@netzerd.com',
            role: 'Administrator',
            isAdmin: true
        });
    }
    
    allUsers.forEach(user => {
        // Contar tareas asignadas al usuario
        const userTasks = appState.tasks.filter(t => t.assignee === user.id);
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="user-cell">
                    <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff`}" alt="${user.name}" class="user-avatar-small">
                    <span>${user.name}</span>
                </div>
            </td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.role}</td>
            <td><span class="status-badge ${user.isAdmin ? 'status-admin' : 'status-active'}">
                ${user.isAdmin ? 'Administrador' : 'Activo'}</span>
            </td>
            <td>${userTasks.length} (${completedTasks} completadas)</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="assignTasks('${user.id}')">
                        <i class="fas fa-tasks"></i>
                    </button>
                    <button class="btn-icon ${user.id === 'admin-001' ? 'disabled' : ''}" 
                            onclick="deleteUser('${user.id}')" 
                            ${user.id === 'admin-001' ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function editUser(userId) {
    const user = appState.team.find(u => u.id === userId) || 
                (userId === 'admin-001' ? {
                    id: 'admin-001',
                    name: 'Administrador',
                    email: 'admin@netzerd.com',
                    role: 'Administrator',
                    isAdmin: true,
                    permissions: ['create', 'edit', 'delete', 'admin']
                } : null);
    
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = 'Editar Usuario';
    document.getElementById('userForm').dataset.userId = user.id;
    
    // Llenar el formulario
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPassword').value = ''; // No mostramos la contraseña actual
    document.getElementById('userRole').value = user.role || '';
    document.getElementById('userSkills').value = (user.skills || []).join(', ');
    
    // Permisos
    document.getElementById('permCreate').checked = user.permissions?.includes('create') || false;
    document.getElementById('permEdit').checked = user.permissions?.includes('edit') || false;
    document.getElementById('permDelete').checked = user.permissions?.includes('delete') || false;
    document.getElementById('permAdmin').checked = user.permissions?.includes('admin') || false;
    
    document.getElementById('userModal').classList.add('active');
}

function deleteUser(userId) {
    // No permitir eliminar al admin
    if (userId === 'admin-001') return;
    
    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
        // Eliminar usuario
        appState.team = appState.team.filter(u => u.id !== userId);
        
        // Reasignar tareas al administrador
        appState.tasks.forEach(task => {
            if (task.assignee === userId) {
                task.assignee = 'admin-001';
            }
        });
        
        // Guardar cambios
        saveDataToStorage();
        
        // Recargar tabla
        loadUsersTable();
        
        // Notificación
        createNotification('Usuario eliminado', 'El usuario ha sido eliminado correctamente', 'success');
        
        // Registro de actividad
        createActivity('user_deleted', `Usuario eliminado por ${appState.currentUser.name}`);
    }
}

function assignTasks(userId) {
    // Implementar modal para asignar tareas rápidamente
    alert(`Asignación de tareas para ${userId} - Funcionalidad en desarrollo`);
    
    // Aquí implementarías un modal que muestre las tareas disponibles
    // y permita asignarlas al usuario seleccionado
}

// Registrar evento para guardar usuarios
document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUser();
        });
    }
});

function saveUser() {
    const userId = document.getElementById('userForm').dataset.userId;
    const isNewUser = !userId;
    
    // Recoger permisos seleccionados
    const permissions = [];
    if (document.getElementById('permCreate').checked) permissions.push('create');
    if (document.getElementById('permEdit').checked) permissions.push('edit');
    if (document.getElementById('permDelete').checked) permissions.push('delete');
    if (document.getElementById('permAdmin').checked) permissions.push('admin');
    
    // Crear objeto de usuario
    const user = {
        id: userId || generateId(),
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        password: document.getElementById('userPassword').value, // En producción, hashear la contraseña
        role: document.getElementById('userRole').value,
        skills: document.getElementById('userSkills').value.split(',').map(s => s.trim()).filter(s => s),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('userName').value)}&background=2563eb&color=fff`,
        permissions: permissions,
        isAdmin: permissions.includes('admin')
    };
    
    // Si es admin y está editando su propio usuario, mantener el rol de admin
    if (userId === 'admin-001') {
        user.isAdmin = true;
        if (!user.permissions.includes('admin')) {
            user.permissions.push('admin');
        }
    }
    
    // Guardar o actualizar usuario
    if (isNewUser) {
        appState.team.push(user);
        createActivity('user_created', `Usuario ${user.name} creado por ${appState.currentUser.name}`);
    } else {
        const index = appState.team.findIndex(u => u.id === userId);
        if (index >= 0) {
            // Si es una edición pero no se proporcionó contraseña, mantener la existente
            if (!user.password && appState.team[index].password) {
                user.password = appState.team[index].password;
            }
            appState.team[index] = user;
        } else if (userId === 'admin-001') {
            // Actualizar usuario admin en localStorage
            const adminUser = JSON.parse(localStorage.getItem(APP_CONFIG.storage_prefix + 'session'));
            adminUser.name = user.name;
            adminUser.email = user.email;
            if (user.password) adminUser.password = user.password;
            localStorage.setItem(APP_CONFIG.storage_prefix + 'session', JSON.stringify(adminUser));
        }
        createActivity('user_updated', `Usuario ${user.name} actualizado por ${appState.currentUser.name}`);
    }
    
    // Guardar cambios
    saveDataToStorage();
    
    // Cerrar modal y actualizar vista
    closeUserModal();
    loadUsersTable();
    
    // Notificación
    createNotification(
        isNewUser ? 'Usuario creado' : 'Usuario actualizado',
        `El usuario ${user.name} ha sido ${isNewUser ? 'creado' : 'actualizado'} correctamente`,
        'success'
    );
}

function loadActivityLog() {
    const tableBody = document.getElementById('activityLogTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Mostrar últimas 50 actividades
    const recentActivities = appState.activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);
    
    recentActivities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(activity.timestamp)} ${new Date(activity.timestamp).toLocaleTimeString()}</td>
            <td>${activity.user}</td>
            <td>${getActivityTypeLabel(activity.type)}</td>
            <td>${activity.description}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function getActivityTypeLabel(type) {
    const labels = {
        task_created: 'Tarea creada',
        task_updated: 'Tarea actualizada',
        task_completed: 'Tarea completada',
        task_deleted: 'Tarea eliminada',
        comment_added: 'Comentario añadido',
        user_created: 'Usuario creado',
        user_updated: 'Usuario actualizado',
        user_deleted: 'Usuario eliminado',
        login: 'Inicio de sesión',
        logout: 'Cierre de sesión'
    };
    return labels[type] || type;
}

function filterActivityLog() {
    // Implementar filtrado del registro de actividad
    const type = document.getElementById('filterActivityType').value;
    const startDate = document.getElementById('activityStartDate').value;
    const endDate = document.getElementById('activityEndDate').value;
    
    // Aquí implementarías la lógica de filtrado
    // Por ahora, solo recargamos el registro completo
    loadActivityLog();
}

function exportUserData() {
    const data = {
        users: appState.team,
        exportDate: new Date().toISOString(),
        exportedBy: appState.currentUser.name
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netzerd-users-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    createNotification('Exportación Exitosa', 'Los datos de usuarios han sido exportados correctamente', 'success');
}

// Iniciar actualizaciones en tiempo real
startRealTimeUpdates();

console.log('Netzerd DevTracker Pro v2.0 - Sistema iniciado correctamente');