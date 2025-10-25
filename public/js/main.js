// ====== PUBLIC/JS/MAIN.JS - VERSIÓN COMPLETA Y CORREGIDA ======

// VARIABLES GLOBALES
let currentUser = null;
const API_URL = '/api';

// FUNCIÓN DE FORMATO DE MONEDA
function formatCurrency(amount) {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando aplicación...');
  
  // Verificar sesión
  const user = checkSession();
  if (!user) {
    console.log('❌ No hay sesión, redirigiendo a login...');
    window.location.href = '/login';
    return;
  }

  currentUser = user;
  console.log('✅ Usuario autenticado:', currentUser);

  // Actualizar nombre de usuario
  updateUserName();

  // Configurar navegación
  setupNavigation();

  // Configurar hamburger menu
  setupHamburgerMenu();

  // Cargar datos iniciales según rol
  if (currentUser.role_id === 1) {
    console.log('📊 Cargando dashboard de administrador...');
    await loadAdminDashboard();
  } else if (currentUser.role_id === 2) {
    console.log('💅 Cargando dashboard de manicurista...');
    await loadManicuristDashboard();
  } else if (currentUser.role_id === 3) {
    console.log('👤 Cargando dashboard de cliente...');
    await loadClientDashboard();
  }

  console.log('✅ Dashboard cargado completamente');
});

// ====== FUNCIONES COMUNES ======

function updateUserName() {
  const userNameElements = [
    document.getElementById('userNameAdmin'),
    document.getElementById('userNameClient'),
    document.getElementById('userNameManicurist')
  ];
  
  userNameElements.forEach(el => {
    if (el) {
      el.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    }
  });
}

function setupHamburgerMenu() {
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.querySelector('.sidebar');
  
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }
}

function setupNavigation() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      console.log('📍 Navegando a sección:', section);
      showSection(section);

      // Remover clase active de todos
      menuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function showSection(sectionId) {
  // Ocultar todas las secciones
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(s => s.style.display = 'none');

  // Mostrar sección seleccionada
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = 'block';
  }

  // Cerrar sidebar en mobile
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('show');
  }
}

function logout() {
  if (confirm('¿Estás seguro de cerrar sesión?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  if (!messageEl) {
    alert(text);
    return;
  }

  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;

  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 4000);
}

function getStatusColor(status) {
  const colors = {
    'Agendada': '#2196f3',
    'Completada': '#4caf50',
    'Cancelada': '#f44336'
  };
  return colors[status] || '#999';
}

// ====== ADMIN DASHBOARD ======

async function loadAdminDashboard() {
  try {
    await loadAdminOverview();
    await loadServices();
    await loadAllAppointments();
    await loadAllUsers();
    loadAdminProfile();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

async function loadAdminOverview() {
  try {
    const headers = getAuthHeader();

    const appointmentsRes = await fetch(`${API_URL}/appointments/all`, { headers });
    const appointments = await appointmentsRes.json();
    
    const totalAppEl = document.getElementById('totalAppointments');
    if (totalAppEl) totalAppEl.textContent = appointments.length;

    const usersRes = await fetch(`${API_URL}/users/all`, { headers });
    const users = await usersRes.json();
    
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = users.length;

    const servicesRes = await fetch(`${API_URL}/services`, { headers });
    const services = await servicesRes.json();
    
    const totalServicesEl = document.getElementById('totalServices');
    if (totalServicesEl) totalServicesEl.textContent = services.length;

    const totalRevenue = appointments
      .filter(a => a.status === 'Completada')
      .reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
    
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);

  } catch (error) {
    console.error('Error loading overview:', error);
  }
}

async function loadServices() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/services`, { headers });
    const services = await res.json();

    const tbody = document.getElementById('servicesTable');
    if (!tbody) return;

    tbody.innerHTML = services.map(service => `
      <tr>
        <td>${service.name}</td>
        <td>${service.description || '-'}</td>
        <td>${formatCurrency(service.price)}</td>
        <td>${service.duration_min} min</td>
        <td>${service.manicurist_commission_rate}%</td>
        <td>
          <button class="btn btn-primary btn-edit-service" data-id="${service.service_id}" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Editar</button>
          <button class="btn btn-delete-service" data-id="${service.service_id}" style="padding: 5px 10px; font-size: 12px; background: #f44336; color: white;">Eliminar</button>
        </td>
      </tr>
    `).join('');

    // Agregar eventos a los botones de editar
    document.querySelectorAll('.btn-edit-service').forEach(btn => {
      btn.addEventListener('click', () => {
        const serviceId = parseInt(btn.getAttribute('data-id'));
        editService(serviceId);
      });
    });

    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.btn-delete-service').forEach(btn => {
      btn.addEventListener('click', () => {
        const serviceId = parseInt(btn.getAttribute('data-id'));
        deleteService(serviceId);
      });
    });
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

let currentServiceId = null;

function openServiceModal() {
  currentServiceId = null;
  const modal = document.getElementById('serviceModal');
  const form = document.getElementById('serviceForm');
  if (form) form.reset();
  document.querySelector('#serviceModal h2').textContent = 'Nuevo Servicio';
  if (modal) modal.classList.add('show');
}

function closeServiceModal() {
  const modal = document.getElementById('serviceModal');
  if (modal) modal.classList.remove('show');
  currentServiceId = null;
}

async function editService(serviceId) {
  try {
    console.log('🔧 Editando servicio ID:', serviceId);
    
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/services`, { headers });
    const services = await res.json();
    
    const service = services.find(s => s.service_id === serviceId);
    if (!service) {
      showMessage('Servicio no encontrado', 'error');
      return;
    }

    console.log('✅ Servicio encontrado:', service);

    currentServiceId = serviceId;

    // Llenar el formulario
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDescription').value = service.description || '';
    document.getElementById('servicePrice').value = service.price;
    document.getElementById('serviceDuration').value = service.duration_min;
    document.getElementById('serviceCommission').value = service.manicurist_commission_rate;

    // Cambiar título del modal
    document.querySelector('#serviceModal h2').textContent = 'Editar Servicio';
    
    // Abrir modal
    const modal = document.getElementById('serviceModal');
    if (modal) modal.classList.add('show');
  } catch (error) {
    console.error('Error al cargar servicio:', error);
    showMessage('Error al cargar servicio', 'error');
  }
}

async function deleteService(serviceId) {
  console.log('🗑️ Intentando eliminar servicio ID:', serviceId);
  
  // Crear modal de confirmación
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal show';
  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Confirmar Eliminación</h2>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="text-align: center; margin-bottom: 20px;">¿Estás seguro de que deseas eliminar este servicio?</p>
        <p style="text-align: center; color: #f44336; font-size: 14px;">Esta acción no se puede deshacer.</p>
      </div>
      <div style="display: flex; gap: 10px; padding: 20px;">
        <button class="btn btn-secondary" id="cancelDeleteService" style="flex: 1;">Cancelar</button>
        <button class="btn" id="confirmDeleteService" style="flex: 1; background: #f44336; color: white;">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  // Evento cancelar
  document.getElementById('cancelDeleteService').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  // Evento confirmar
  document.getElementById('confirmDeleteService').addEventListener('click', async () => {
    try {
      console.log('✅ Confirmado eliminar servicio ID:', serviceId);
      
      const response = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        showMessage('Servicio eliminado exitosamente', 'success');
        document.body.removeChild(confirmModal);
        await loadServices();
        await loadAdminOverview();
      } else {
        const error = await response.json();
        showMessage(error.message, 'error');
        document.body.removeChild(confirmModal);
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      showMessage('Error de conexión', 'error');
      document.body.removeChild(confirmModal);
    }
  });
}

// Evento formulario de servicio
const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
  serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(serviceForm);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price')),
      duration_min: parseInt(formData.get('duration_min')),
      manicurist_commission_rate: parseFloat(formData.get('manicurist_commission_rate'))
    };

    try {
      let response;
      
      if (currentServiceId) {
        response = await fetch(`${API_URL}/services/${currentServiceId}`, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify(data)
        });
      } else {
        response = await fetch(`${API_URL}/services`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: JSON.stringify(data)
        });
      }

      if (response.ok) {
        showMessage(currentServiceId ? 'Servicio actualizado' : 'Servicio creado', 'success');
        closeServiceModal();
        serviceForm.reset();
        currentServiceId = null;
        loadServices();
        loadAdminOverview();
      } else {
        const error = await response.json();
        showMessage(error.message, 'error');
      }
    } catch (error) {
      showMessage('Error al guardar servicio', 'error');
    }
  });
}

async function loadAllUsers() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/users/all`, { headers });
    const users = await res.json();

    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    const roleNames = { 1: 'Administrador', 2: 'Manicurista', 3: 'Cliente' };

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.first_name} ${user.last_name}</td>
        <td>${user.email}</td>
        <td>${user.phone_number || '-'}</td>
        <td>${roleNames[user.role_id]}</td>
        <td>${new Date(user.created_at).toLocaleDateString('es-CO')}</td>
        <td>
          <button class="btn btn-primary btn-edit-user" data-id="${user.user_id}" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Editar</button>
          ${user.user_id !== currentUser.user_id ? `
            <button class="btn btn-delete-user" data-id="${user.user_id}" style="padding: 5px 10px; font-size: 12px; background: #f44336; color: white;">Eliminar</button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    // Agregar eventos a los botones de editar
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = parseInt(btn.getAttribute('data-id'));
        editUser(userId);
      });
    });

    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = parseInt(btn.getAttribute('data-id'));
        deleteUser(userId);
      });
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

let currentEditUserId = null;

async function editUser(userId) {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/users/all`, { headers });
    const users = await res.json();
    
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    currentEditUserId = userId;

    let modal = document.getElementById('userModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'userModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Editar Usuario</h2>
            <button class="close-btn" onclick="closeUserModal()">&times;</button>
          </div>
          <form id="userEditForm" class="auth-form">
            <div class="form-row">
              <div class="form-group">
                <label for="userFirstName">Nombre</label>
                <input type="text" id="userFirstName" name="first_name" required>
              </div>
              <div class="form-group">
                <label for="userLastName">Apellido</label>
                <input type="text" id="userLastName" name="last_name" required>
              </div>
            </div>
            <div class="form-group">
              <label for="userEmail">Email</label>
              <input type="email" id="userEmail" name="email" disabled>
            </div>
            <div class="form-group">
              <label for="userPhone">Teléfono</label>
              <input type="tel" id="userPhone" name="phone_number">
            </div>
            <div class="form-group">
              <label for="userRole">Rol</label>
              <select id="userRole" name="role_id" required>
                <option value="1">Administrador</option>
                <option value="2">Manicurista</option>
                <option value="3">Cliente</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Guardar Cambios</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('userEditForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUser();
      });
    }

    document.getElementById('userFirstName').value = user.first_name;
    document.getElementById('userLastName').value = user.last_name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPhone').value = user.phone_number || '';
    document.getElementById('userRole').value = user.role_id;

    modal.classList.add('show');
  } catch (error) {
    console.error('Error al cargar usuario:', error);
  }
}

async function updateUser() {
  try {
    const data = {
      first_name: document.getElementById('userFirstName').value,
      last_name: document.getElementById('userLastName').value,
      phone_number: document.getElementById('userPhone').value,
      role_id: parseInt(document.getElementById('userRole').value)
    };

    const response = await fetch(`${API_URL}/users/${currentEditUserId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showMessage('Usuario actualizado exitosamente', 'success');
      closeUserModal();
      loadAllUsers();
    } else {
      showMessage('Error al actualizar usuario', 'error');
    }
  } catch (error) {
    showMessage('Error de conexión', 'error');
  }
}

async function deleteUser(userId) {
  console.log('🗑️ Intentando eliminar usuario ID:', userId);
  
  // Crear modal de confirmación
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal show';
  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Confirmar Eliminación</h2>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="text-align: center; margin-bottom: 20px;">¿Estás seguro de que deseas eliminar este usuario?</p>
        <p style="text-align: center; color: #f44336; font-size: 14px;">Esta acción no se puede deshacer.</p>
      </div>
      <div style="display: flex; gap: 10px; padding: 20px;">
        <button class="btn btn-secondary" id="cancelDeleteUser" style="flex: 1;">Cancelar</button>
        <button class="btn" id="confirmDeleteUser" style="flex: 1; background: #f44336; color: white;">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  // Evento cancelar
  document.getElementById('cancelDeleteUser').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  // Evento confirmar
  document.getElementById('confirmDeleteUser').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        showMessage('Usuario eliminado exitosamente', 'success');
        document.body.removeChild(confirmModal);
        await loadAllUsers();
        await loadAdminOverview();
      } else {
        const error = await response.json();
        showMessage(error.message, 'error');
        document.body.removeChild(confirmModal);
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
      document.body.removeChild(confirmModal);
    }
  });
}

function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (modal) modal.classList.remove('show');
  currentEditUserId = null;
}

async function loadAllAppointments() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/appointments/all`, { headers });
    const appointments = await res.json();

    const tbody = document.getElementById('appointmentsTable');
    if (!tbody) return;

    tbody.innerHTML = appointments.map(app => `
      <tr>
        <td>${app.client_name} ${app.client_lastname}</td>
        <td>${app.manicurist_name} ${app.manicurist_lastname}</td>
        <td>${app.service_name}</td>
        <td>${new Date(app.start_time).toLocaleString('es-CO')}</td>
        <td><span style="background: ${getStatusColor(app.status)}; color: white; padding: 5px 10px; border-radius: 3px;">${app.status}</span></td>
        <td>${formatCurrency(app.price)}</td>
        <td>
          <button class="btn" style="padding: 5px 10px; font-size: 12px; background: #f44336; color: white;" onclick="deleteAppointment(${app.appointment_id})">Eliminar</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

function openAdminAppointmentModal() {
  let modal = document.getElementById('adminAppointmentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'adminAppointmentModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nueva Cita</h2>
          <button class="close-btn" onclick="closeAdminAppointmentModal()">&times;</button>
        </div>
        <form id="adminAppointmentForm" class="auth-form">
          <div class="form-group">
            <label for="adminAppClient">Cliente</label>
            <select id="adminAppClient" name="client_id" required></select>
          </div>
          <div class="form-group">
            <label for="adminAppManicurist">Manicurista</label>
            <select id="adminAppManicurist" name="manicurist_id" required></select>
          </div>
          <div class="form-group">
            <label for="adminAppService">Servicio</label>
            <select id="adminAppService" name="service_id" required></select>
          </div>
          <div class="form-group">
            <label for="adminAppDateTime">Fecha y Hora</label>
            <input type="datetime-local" id="adminAppDateTime" name="start_time" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Crear Cita</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('adminAppointmentForm').addEventListener('submit', createAdminAppointment);
  }

  loadAppointmentData();
  modal.classList.add('show');
}

async function loadAppointmentData() {
  try {
    const headers = getAuthHeader();

    const clientsRes = await fetch(`${API_URL}/users/all?role_id=3`, { headers });
    const clients = await clientsRes.json();
    document.getElementById('adminAppClient').innerHTML = clients.map(c => 
      `<option value="${c.user_id}">${c.first_name} ${c.last_name}</option>`
    ).join('');

    const manicuristsRes = await fetch(`${API_URL}/users/manicurists`, { headers });
    const manicurists = await manicuristsRes.json();
    document.getElementById('adminAppManicurist').innerHTML = manicurists.map(m => 
      `<option value="${m.user_id}">${m.first_name} ${m.last_name}</option>`
    ).join('');

    const servicesRes = await fetch(`${API_URL}/services`, { headers });
    const services = await servicesRes.json();
    document.getElementById('adminAppService').innerHTML = services.map(s => 
      `<option value="${s.service_id}">${s.name} - ${formatCurrency(s.price)}</option>`
    ).join('');
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

async function createAdminAppointment(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    client_id: parseInt(formData.get('client_id')),
    manicurist_id: parseInt(formData.get('manicurist_id')),
    service_id: parseInt(formData.get('service_id')),
    start_time: formData.get('start_time')
  };

  try {
    const response = await fetch(`${API_URL}/appointments/admin`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showMessage('Cita creada exitosamente', 'success');
      closeAdminAppointmentModal();
      loadAllAppointments();
      loadAdminOverview();
    } else {
      const error = await response.json();
      showMessage(error.message, 'error');
    }
  } catch (error) {
    showMessage('Error al crear cita', 'error');
  }
}

function closeAdminAppointmentModal() {
  const modal = document.getElementById('adminAppointmentModal');
  if (modal) modal.classList.remove('show');
}

async function deleteAppointment(appointmentId) {
  if (!confirm('¿Estás seguro de eliminar esta cita?')) return;

  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (response.ok) {
      showMessage('Cita eliminada exitosamente', 'success');
      loadAllAppointments();
      loadAdminOverview();
    } else {
      showMessage('Error al eliminar cita', 'error');
    }
  } catch (error) {
    showMessage('Error de conexión', 'error');
  }
}

function loadAdminProfile() {
  loadProfile();
}

// ====== CLIENT DASHBOARD ======

async function loadClientDashboard() {
  try {
    await loadClientAppointments();
    await loadClientServices();
    loadClientProfile();
  } catch (error) {
    console.error('Error loading client dashboard:', error);
  }
}

async function loadClientAppointments() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/appointments/client`, { headers });
    const appointments = await res.json();

    const container = document.getElementById('appointmentsListClient');
    if (!container) return;

    if (appointments.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #999;">No tienes citas agendadas</p>';
      return;
    }

    container.innerHTML = appointments.map(app => `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 10px;">
          <div>
            <h4>${app.service_name}</h4>
            <p><strong>Manicurista:</strong> ${app.first_name} ${app.last_name}</p>
            <p><strong>Fecha:</strong> ${new Date(app.start_time).toLocaleString('es-CO')}</p>
            <p><strong>Precio:</strong> ${formatCurrency(app.price)}</p>
            <p><strong>Estado:</strong> <span style="background: ${getStatusColor(app.status)}; color: white; padding: 5px 10px; border-radius: 3px;">${app.status}</span></p>
          </div>
          ${app.status !== 'Cancelada' && app.status !== 'Completada' ? `
            <button class="btn btn-secondary btn-cancel-appointment" data-id="${app.appointment_id}">Cancelar</button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // Agregar eventos a los botones de cancelar
    document.querySelectorAll('.btn-cancel-appointment').forEach(btn => {
      btn.addEventListener('click', () => {
        const appointmentId = parseInt(btn.getAttribute('data-id'));
        cancelAppointment(appointmentId);
      });
    });
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

async function loadClientServices() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/services`, { headers });
    const services = await res.json();

    const container = document.getElementById('servicesListClient');
    if (!container) return;

    container.innerHTML = services.map(service => `
      <div class="service-card">
        <span class="service-icon">💅</span>
        <h4>${service.name}</h4>
        <p>${service.description || 'Servicio de manicura'}</p>
        <p><strong>Precio:</strong> ${formatCurrency(service.price)}</p>
        <p><strong>Duración:</strong> ${service.duration_min} minutos</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

function loadClientProfile() {
  loadProfile();
}

async function openBookAppointmentModal() {
  const modal = document.getElementById('bookAppointmentModal');
  if (modal) {
    try {
      const headers = getAuthHeader();
      
      const servicesRes = await fetch(`${API_URL}/services`, { headers });
      const services = await servicesRes.json();
      const serviceSelect = document.getElementById('appointmentService');
      serviceSelect.innerHTML = services.map(s => 
        `<option value="${s.service_id}">${s.name} - ${formatCurrency(s.price)}</option>`
      ).join('');

      const manicuristsRes = await fetch(`${API_URL}/users/manicurists`, { headers });
      const manicurists = await manicuristsRes.json();
      const manicuristSelect = document.getElementById('appointmentManicurist');
      manicuristSelect.innerHTML = manicurists.map(m => 
        `<option value="${m.user_id}">${m.first_name} ${m.last_name}</option>`
      ).join('');

      modal.classList.add('show');
    } catch (error) {
      showMessage('Error al cargar datos', 'error');
    }
  }
}

function closeBookAppointmentModal() {
  const modal = document.getElementById('bookAppointmentModal');
  if (modal) modal.classList.remove('show');
}

const bookAppointmentForm = document.getElementById('bookAppointmentForm');
if (bookAppointmentForm) {
  bookAppointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(bookAppointmentForm);
    const data = {
      manicurist_id: parseInt(formData.get('manicurist_id')),
      service_id: parseInt(formData.get('service_id')),
      start_time: formData.get('start_time')
    };

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showMessage('¡Cita agendada exitosamente!', 'success');
        closeBookAppointmentModal();
        bookAppointmentForm.reset();
        loadClientAppointments();
      } else {
        const error = await response.json();
        showMessage(error.message || 'Error al agendar cita', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  });
}

async function cancelAppointment(appointmentId) {
  console.log('❌ Intentando cancelar cita ID:', appointmentId);
  
  // Crear modal de confirmación
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal show';
  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Confirmar Cancelación</h2>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="text-align: center; margin-bottom: 20px;">¿Estás seguro de que deseas cancelar esta cita?</p>
        <p style="text-align: center; color: #666; font-size: 14px;">Podrás reagendar posteriormente si lo deseas.</p>
      </div>
      <div style="display: flex; gap: 10px; padding: 20px;">
        <button class="btn btn-secondary" id="cancelCancelAppointment" style="flex: 1;">No, mantener cita</button>
        <button class="btn" id="confirmCancelAppointment" style="flex: 1; background: #f44336; color: white;">Sí, cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  // Evento cancelar
  document.getElementById('cancelCancelAppointment').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  // Evento confirmar
  document.getElementById('confirmCancelAppointment').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
        method: 'PUT',
        headers: getAuthHeader()
      });

      if (response.ok) {
        showMessage('Cita cancelada exitosamente', 'success');
        document.body.removeChild(confirmModal);
        await loadClientAppointments();
      } else {
        const error = await response.json();
        showMessage(error.message, 'error');
        document.body.removeChild(confirmModal);
      }
    } catch (error) {
      showMessage('Error al cancelar cita', 'error');
      document.body.removeChild(confirmModal);
    }
  });
}

// ====== MANICURIST DASHBOARD ======

async function loadManicuristDashboard() {
  try {
    await loadManicuristAppointments();
    await loadManicuristEarnings();
    await loadServicesForWork(); // Para formulario de registro de trabajo
    await loadMyWorks(); // Cargar historial de trabajos
    loadManicuristProfile();
  } catch (error) {
    console.error('Error loading manicurist dashboard:', error);
  }
}

async function loadManicuristAppointments() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/appointments/manicurist`, { headers });
    const appointments = await res.json();

    const tbody = document.getElementById('appointmentsTableManicurist');
    if (!tbody) return;

    tbody.innerHTML = appointments.map(app => `
      <tr>
        <td>${app.first_name} ${app.last_name}</td>
        <td>${app.service_name}</td>
        <td>${new Date(app.start_time).toLocaleString('es-CO')}</td>
        <td>
          <select onchange="updateAppointmentStatus(${app.appointment_id}, this.value)" style="padding: 5px;">
            <option value="Agendada" ${app.status === 'Agendada' ? 'selected' : ''}>Agendada</option>
            <option value="Completada" ${app.status === 'Completada' ? 'selected' : ''}>Completada</option>
            <option value="Cancelada" ${app.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
          </select>
        </td>
        <td>${formatCurrency(app.price)}</td>
        <td>
          <button class="btn btn-secondary" onclick="callClient('${app.phone_number}')" style="padding: 5px 10px; font-size: 12px;">Llamar</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

async function loadManicuristEarnings() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/appointments/manicurist`, { headers });
    const appointments = await res.json();

    let pendingTotal = 0;
    let paidTotal = 0;

    const tbody = document.getElementById('commissionsTableManicurist');
    if (!tbody) return;

    const commissionsHTML = appointments
      .filter(app => app.commission_amount)
      .map(app => {
        if (app.is_paid) {
          paidTotal += parseFloat(app.commission_amount);
        } else {
          pendingTotal += parseFloat(app.commission_amount);
        }

        return `
          <tr>
            <td>#${app.appointment_id}</td>
            <td>${app.service_name}</td>
            <td>${formatCurrency(app.price)}</td>
            <td>${formatCurrency(app.commission_amount)}</td>
            <td>${app.is_paid ? 'Pagada' : 'Pendiente'}</td>
            <td>${app.is_paid ? new Date().toLocaleDateString('es-CO') : '-'}</td>
          </tr>
        `;
      }).join('');

    tbody.innerHTML = commissionsHTML || '<tr><td colspan="6" style="text-align: center;">No hay comisiones registradas</td></tr>';
    
    const pendingEl = document.getElementById('pendingCommissions');
    const paidEl = document.getElementById('paidCommissions');
    
    if (pendingEl) pendingEl.textContent = formatCurrency(pendingTotal);
    if (paidEl) paidEl.textContent = formatCurrency(paidTotal);

  } catch (error) {
    console.error('Error loading earnings:', error);
  }
}

function loadManicuristProfile() {
  loadProfile();
}

async function updateAppointmentStatus(appointmentId, status) {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      showMessage('Estado actualizado', 'success');
      loadManicuristAppointments();
      loadManicuristEarnings();
    } else {
      showMessage('Error al actualizar estado', 'error');
    }
  } catch (error) {
    showMessage('Error de conexión', 'error');
  }
}

function callClient(phoneNumber) {
  if (!phoneNumber) {
    showMessage('Número de teléfono no disponible', 'error');
    return;
  }
  window.location.href = `tel:${phoneNumber}`;
}

// ====== PERFIL (Común para todos) ======

async function loadProfile() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/users/profile`, { headers });
    const user = await res.json();

    const firstNameEl = document.getElementById('profileFirstName');
    const lastNameEl = document.getElementById('profileLastName');
    const emailEl = document.getElementById('profileEmail');
    const phoneEl = document.getElementById('profilePhone');

    if (firstNameEl) firstNameEl.value = user.first_name;
    if (lastNameEl) lastNameEl.value = user.last_name;
    if (emailEl) emailEl.value = user.email;
    if (phoneEl) phoneEl.value = user.phone_number || '';

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      // Remover listener anterior si existe
      const newForm = profileForm.cloneNode(true);
      profileForm.parentNode.replaceChild(newForm, profileForm);
      
      newForm.addEventListener('submit', updateProfile);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function updateProfile(e) {
  e.preventDefault();

  const data = {
    first_name: document.getElementById('profileFirstName').value,
    last_name: document.getElementById('profileLastName').value,
    phone_number: document.getElementById('profilePhone').value
  };

  try {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showMessage('Perfil actualizado exitosamente', 'success');
      currentUser.first_name = data.first_name;
      currentUser.last_name = data.last_name;
      localStorage.setItem('user', JSON.stringify(currentUser));
      updateUserName();
    } else {
      showMessage('Error al actualizar perfil', 'error');
    }
  } catch (error) {
    showMessage('Error de conexión', 'error');
  }
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', (e) => {
  const modals = document.querySelectorAll('.modal.show');
  modals.forEach(modal => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
});

// CARGAR SERVICIOS EN EL FORMULARIO DE REGISTRO
async function loadServicesForWork() {
  try {
    console.log('🔧 Cargando servicios para formulario de trabajo...');
    
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/services`, { headers });
    
    if (!res.ok) {
      console.error('Error al obtener servicios:', res.status);
      return;
    }
    
    const services = await res.json();
    console.log('✅ Servicios obtenidos:', services);

    const serviceSelect = document.getElementById('workService');
    if (!serviceSelect) {
      console.warn('⚠️ Elemento workService no encontrado en el DOM');
      return;
    }

    serviceSelect.innerHTML = '<option value="">Selecciona un servicio...</option>' +
      services.map(s => 
        `<option value="${s.service_id}" data-price="${s.price}" data-commission="${s.manicurist_commission_rate}">
          ${s.name} - ${formatCurrency(s.price)}
        </option>`
      ).join('');

    console.log('✅ Select de servicios poblado');

    // Event listener para calcular comisión automáticamente
    serviceSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      if (!selectedOption.value) return;
      
      const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
      const commissionRate = parseFloat(selectedOption.getAttribute('data-commission')) || 0;

      const priceInput = document.getElementById('servicePriceDefault');
      const commissionPreview = document.getElementById('commissionPreview');
      const defaultPriceInfo = document.getElementById('defaultPriceInfo');

      if (price > 0) {
        priceInput.value = price;
        const commission = price * (commissionRate / 100);
        commissionPreview.value = formatCurrency(commission);
        defaultPriceInfo.textContent = `Precio por defecto: ${formatCurrency(price)} | Comisión: ${commissionRate}%`;
        
        console.log('💰 Comisión calculada:', formatCurrency(commission));
      }
    });

    // Event listener para recalcular comisión cuando cambia el precio
    const priceInput = document.getElementById('servicePriceDefault');
    if (priceInput) {
      priceInput.addEventListener('input', function() {
        const serviceSelect = document.getElementById('workService');
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        
        if (!selectedOption.value) return;
        
        const commissionRate = parseFloat(selectedOption.getAttribute('data-commission')) || 0;
        const customPrice = parseFloat(this.value) || 0;

        const commissionPreview = document.getElementById('commissionPreview');
        const commission = customPrice * (commissionRate / 100);
        commissionPreview.value = formatCurrency(commission);
      });
    }

    // Establecer fecha y hora actual por defecto
    const workDateInput = document.getElementById('workDate');
    if (workDateInput) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      workDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

  } catch (error) {
    console.error('❌ Error loading services for work:', error);
  }
}

// REGISTRAR NUEVO TRABAJO
const registerWorkForm = document.getElementById('registerWorkForm');
if (registerWorkForm) {
  registerWorkForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(registerWorkForm);
    const data = {
      service_id: parseInt(formData.get('service_id')),
      work_date: formData.get('work_date'),
      client_name: formData.get('client_name') || 'Cliente Walk-in',
      service_price_custom: parseFloat(formData.get('service_price_custom'))
    };

    try {
      const response = await fetch(`${API_URL}/works`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        showMessageWork(`✅ Trabajo registrado. Comisión: ${formatCurrency(result.commission_amount)}`, 'success');
        registerWorkForm.reset();
        
        // Restablecer fecha actual
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('workDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        document.getElementById('commissionPreview').value = '';
        
        // Si está en la sección de trabajos, recargar
        const worksSection = document.getElementById('works');
        if (worksSection && worksSection.style.display !== 'none') {
          loadMyWorks();
        }
      } else {
        const error = await response.json();
        showMessageWork(error.message || 'Error al registrar trabajo', 'error');
      }
    } catch (error) {
      showMessageWork('Error de conexión', 'error');
    }
  });
}

// CARGAR MIS TRABAJOS
async function loadMyWorks(startDate = null, endDate = null) {
  try {
    const headers = getAuthHeader();
    
    let url = `${API_URL}/works/my-works`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, { headers });
    const data = await res.json();

    // Actualizar tarjetas de resumen
    document.getElementById('totalWorksCount').textContent = data.summary.total_works;
    document.getElementById('totalClientPaid').textContent = formatCurrency(data.summary.total_paid);
    document.getElementById('totalCommissionsWork').textContent = formatCurrency(data.summary.total_commission);
    document.getElementById('paidCommissionsWork').textContent = formatCurrency(data.summary.total_paid_commission);
    document.getElementById('pendingCommissionsWork').textContent = formatCurrency(data.summary.total_pending_commission);

    // Actualizar tabla
    const tbody = document.getElementById('worksTableBody');
    if (!tbody) return;

    if (data.works.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">No hay trabajos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = data.works.map(work => `
      <tr>
        <td>${new Date(work.work_date).toLocaleString('es-CO')}</td>
        <td>${work.client_name || 'Cliente Walk-in'}</td>
        <td>${work.service_name}</td>
        <td>${formatCurrency(work.paid_price)}</td>
        <td style="color: #2e7d32; font-weight: bold;">${formatCurrency(work.commission_amount)}</td>
        <td>
          ${work.is_paid 
            ? '<span style="background: #4caf50; color: white; padding: 5px 10px; border-radius: 3px;">✓ Pagada</span>' 
            : '<span style="background: #ff9800; color: white; padding: 5px 10px; border-radius: 3px;">⏳ Pendiente</span>'}
        </td>
        <td>
          <button class="btn btn-delete-work" data-id="${work.work_id}" style="padding: 5px 10px; font-size: 12px; background: #f44336; color: white;">Eliminar</button>
        </td>
      </tr>
    `).join('');

    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.btn-delete-work').forEach(btn => {
      btn.addEventListener('click', () => {
        const workId = parseInt(btn.getAttribute('data-id'));
        deleteWork(workId);
      });
    });

  } catch (error) {
    console.error('Error loading works:', error);
  }
}

// FILTRAR TRABAJOS POR FECHA
function filterWorks() {
  const startDate = document.getElementById('filterStartDate').value;
  const endDate = document.getElementById('filterEndDate').value;

  if (!startDate && !endDate) {
    showMessageWork('Por favor selecciona al menos una fecha', 'error');
    return;
  }

  loadMyWorks(startDate, endDate);
}

// LIMPIAR FILTROS
function clearFilters() {
  document.getElementById('filterStartDate').value = '';
  document.getElementById('filterEndDate').value = '';
  loadMyWorks();
}

// ELIMINAR TRABAJO
async function deleteWork(workId) {
  console.log('🗑️ Intentando eliminar trabajo ID:', workId);
  
  // Crear modal de confirmación
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal show';
  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Confirmar Eliminación</h2>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="text-align: center; margin-bottom: 20px;">¿Estás seguro de que deseas eliminar este trabajo?</p>
        <p style="text-align: center; color: #f44336; font-size: 14px;">Esta acción no se puede deshacer.</p>
      </div>
      <div style="display: flex; gap: 10px; padding: 20px;">
        <button class="btn btn-secondary" id="cancelDeleteWork" style="flex: 1;">Cancelar</button>
        <button class="btn" id="confirmDeleteWork" style="flex: 1; background: #f44336; color: white;">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  // Evento cancelar
  document.getElementById('cancelDeleteWork').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  // Evento confirmar
  document.getElementById('confirmDeleteWork').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_URL}/works/${workId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        showMessageWork('Trabajo eliminado exitosamente', 'success');
        document.body.removeChild(confirmModal);
        await loadMyWorks();
        await loadManicuristEarnings(); // Actualizar ganancias también
      } else {
        const error = await response.json();
        showMessageWork(error.message, 'error');
        document.body.removeChild(confirmModal);
      }
    } catch (error) {
      showMessageWork('Error de conexión', 'error');
      document.body.removeChild(confirmModal);
    }
  });
}

// MOSTRAR MENSAJE EN SECCIÓN DE TRABAJO
function showMessageWork(text, type) {
  const messageEl = document.getElementById('messageWork');
  if (!messageEl) {
    // Si no existe el elemento, usar el mensaje general
    showMessage(text, type);
    return;
  }

  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;

  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 5000);
}



// ACTUALIZAR FUNCIÓN loadManicuristDashboard PARA INCLUIR TRABAJOS
// Reemplaza la función existente en main.js con esta:
/*
async function loadManicuristDashboard() {
  try {
    await loadManicuristAppointments();
    await loadManicuristEarnings();
    await loadServicesForWork(); // NUEVA
    await loadMyWorks(); // NUEVA
    loadManicuristProfile();
  } catch (error) {
    console.error('Error loading manicurist dashboard:', error);
  }
}
*/

async function loadAdminDashboard() {
  try {
    await loadAdminOverview();
    await loadServices();
    await loadAllAppointments();
    await loadAllUsers();
    await loadServicesForWorkAdmin(); // ⭐ AGREGAR
    await loadManicuristsForWorkAdmin(); // ⭐ AGREGAR
    await loadAllWorksAdmin(); // ⭐ AGREGAR
    loadAdminProfile();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
};

// CARGAR SERVICIOS PARA FORMULARIO DE ADMIN
async function loadServicesForWorkAdmin() {
  try {
    console.log('🔧 Cargando servicios para formulario de admin...');
    
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/services`, { headers });
    
    if (!res.ok) {
      console.error('Error al obtener servicios:', res.status);
      return;
    }
    
    const services = await res.json();

    const serviceSelect = document.getElementById('workServiceAdmin');
    if (!serviceSelect) {
      console.warn('⚠️ Elemento workServiceAdmin no encontrado');
      return;
    }

    serviceSelect.innerHTML = '<option value="">Selecciona un servicio...</option>' +
      services.map(s => 
        `<option value="${s.service_id}" data-price="${s.price}" data-commission="${s.manicurist_commission_rate}">
          ${s.name} - ${formatCurrency(s.price)}
        </option>`
      ).join('');

    // Event listener para calcular comisión
    serviceSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      if (!selectedOption.value) return;
      
      const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
      const commissionRate = parseFloat(selectedOption.getAttribute('data-commission')) || 0;

      const priceInput = document.getElementById('servicePriceDefaultAdmin');
      const commissionPreview = document.getElementById('commissionPreviewAdmin');
      const defaultPriceInfo = document.getElementById('defaultPriceInfoAdmin');

      if (price > 0) {
        priceInput.value = price;
        const commission = price * (commissionRate / 100);
        commissionPreview.value = formatCurrency(commission);
        defaultPriceInfo.textContent = `Precio por defecto: ${formatCurrency(price)} | Comisión: ${commissionRate}%`;
      }
    });

    // Recalcular comisión al cambiar precio
    const priceInput = document.getElementById('servicePriceDefaultAdmin');
    if (priceInput) {
      priceInput.addEventListener('input', function() {
        const serviceSelect = document.getElementById('workServiceAdmin');
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        
        if (!selectedOption.value) return;
        
        const commissionRate = parseFloat(selectedOption.getAttribute('data-commission')) || 0;
        const customPrice = parseFloat(this.value) || 0;

        const commissionPreview = document.getElementById('commissionPreviewAdmin');
        const commission = customPrice * (commissionRate / 100);
        commissionPreview.value = formatCurrency(commission);
      });
    }

    // Establecer fecha actual
    const workDateInput = document.getElementById('workDateAdmin');
    if (workDateInput) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      workDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

  } catch (error) {
    console.error('❌ Error loading services for admin:', error);
  }
}

// CARGAR MANICURISTAS
async function loadManicuristsForWorkAdmin() {
  try {
    const headers = getAuthHeader();
    const res = await fetch(`${API_URL}/users/manicurists`, { headers });
    const manicurists = await res.json();

    // Para el formulario
    const manicuristSelect = document.getElementById('workManicuristAdmin');
    if (manicuristSelect) {
      manicuristSelect.innerHTML = '<option value="">Selecciona una manicurista...</option>' +
        manicurists.map(m => 
          `<option value="${m.user_id}">${m.first_name} ${m.last_name}</option>`
        ).join('');
    }

    // Para el filtro
    const filterSelect = document.getElementById('filterManicuristAdmin');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">Todas las manicuristas</option>' +
        manicurists.map(m => 
          `<option value="${m.user_id}">${m.first_name} ${m.last_name}</option>`
        ).join('');
    }

  } catch (error) {
    console.error('Error loading manicurists:', error);
  }
}

// REGISTRAR TRABAJO (ADMIN)
const registerWorkFormAdmin = document.getElementById('registerWorkFormAdmin');
if (registerWorkFormAdmin) {
  registerWorkFormAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(registerWorkFormAdmin);
    const data = {
      manicurist_id: parseInt(formData.get('manicurist_id')),
      service_id: parseInt(formData.get('service_id')),
      work_date: formData.get('work_date'),
      client_name: formData.get('client_name') || 'Cliente Walk-in',
      service_price_custom: parseFloat(formData.get('service_price_custom'))
    };

    try {
      const response = await fetch(`${API_URL}/works/admin`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        showMessageWorkAdmin(`✅ Trabajo registrado. Comisión: ${formatCurrency(result.commission_amount)}`, 'success');
        registerWorkFormAdmin.reset();
        
        // Restablecer fecha actual
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('workDateAdmin').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        document.getElementById('commissionPreviewAdmin').value = '';
        
        // Recargar si está en la sección de trabajos
        const worksSection = document.getElementById('works');
        if (worksSection && worksSection.style.display !== 'none') {
          loadAllWorksAdmin();
        }
        
        loadAdminOverview(); // Actualizar resumen
      } else {
        const error = await response.json();
        showMessageWorkAdmin(error.message || 'Error al registrar trabajo', 'error');
      }
    } catch (error) {
      showMessageWorkAdmin('Error de conexión', 'error');
    }
  });
}

// CARGAR TODOS LOS TRABAJOS (ADMIN)
async function loadAllWorksAdmin(manicuristId = null, startDate = null, endDate = null) {
  try {
    const headers = getAuthHeader();
    
    let url = `${API_URL}/works/all`;
    const params = new URLSearchParams();
    
    if (manicuristId) params.append('manicurist_id', manicuristId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, { headers });
    const data = await res.json();

    // Actualizar tarjetas de resumen
    document.getElementById('totalWorksCountAdmin').textContent = data.summary.total_works;
    document.getElementById('totalClientPaidAdmin').textContent = formatCurrency(data.summary.total_paid);
    document.getElementById('totalCommissionsWorkAdmin').textContent = formatCurrency(data.summary.total_commission);
    document.getElementById('paidCommissionsWorkAdmin').textContent = formatCurrency(data.summary.total_paid_commission);
    document.getElementById('pendingCommissionsWorkAdmin').textContent = formatCurrency(data.summary.total_pending_commission);

    // Actualizar tabla
    const tbody = document.getElementById('worksTableBodyAdmin');
    if (!tbody) return;

    if (data.works.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999;">No hay trabajos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = data.works.map(work => `
      <tr>
        <td>${new Date(work.work_date).toLocaleString('es-CO')}</td>
        <td>${work.manicurist_first_name} ${work.manicurist_last_name}</td>
        <td>${work.client_name || 'Cliente Walk-in'}</td>
        <td>${work.service_name}</td>
        <td>${formatCurrency(work.paid_price)}</td>
        <td style="color: #2e7d32; font-weight: bold;">${formatCurrency(work.commission_amount)}</td>
        <td>
          ${work.is_paid 
            ? '<span style="background: #4caf50; color: white; padding: 5px 10px; border-radius: 3px;">✓ Pagada</span>' 
            : '<span style="background: #ff9800; color: white; padding: 5px 10px; border-radius: 3px;">⏳ Pendiente</span>'}
        </td>
        <td>
          <button class="btn btn-delete-work-admin" data-id="${work.work_id}" style="padding: 5px 10px; font-size: 12px; background: #f44336; color: white;">Eliminar</button>
        </td>
      </tr>
    `).join('');

    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.btn-delete-work-admin').forEach(btn => {
      btn.addEventListener('click', () => {
        const workId = parseInt(btn.getAttribute('data-id'));
        deleteWorkAdmin(workId);
      });
    });

  } catch (error) {
    console.error('Error loading works (admin):', error);
  }
}

// FILTRAR TRABAJOS (ADMIN)
function filterWorksAdmin() {
  const manicuristId = document.getElementById('filterManicuristAdmin').value;
  const startDate = document.getElementById('filterStartDateAdmin').value;
  const endDate = document.getElementById('filterEndDateAdmin').value;

  loadAllWorksAdmin(manicuristId || null, startDate || null, endDate || null);
}

// LIMPIAR FILTROS (ADMIN)
function clearFiltersAdmin() {
  document.getElementById('filterManicuristAdmin').value = '';
  document.getElementById('filterStartDateAdmin').value = '';
  document.getElementById('filterEndDateAdmin').value = '';
  loadAllWorksAdmin();
}

// ELIMINAR TRABAJO (ADMIN)
async function deleteWorkAdmin(workId) {
  console.log('🗑️ Admin eliminando trabajo ID:', workId);
  
  // Crear modal de confirmación
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal show';
  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Confirmar Eliminación</h2>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="text-align: center; margin-bottom: 20px;">¿Estás seguro de que deseas eliminar este trabajo?</p>
        <p style="text-align: center; color: #f44336; font-size: 14px;">Esta acción no se puede deshacer.</p>
      </div>
      <div style="display: flex; gap: 10px; padding: 20px;">
        <button class="btn btn-secondary" id="cancelDeleteWorkAdmin" style="flex: 1;">Cancelar</button>
        <button class="btn" id="confirmDeleteWorkAdmin" style="flex: 1; background: #f44336; color: white;">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  // Evento cancelar
  document.getElementById('cancelDeleteWorkAdmin').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  // Evento confirmar
  document.getElementById('confirmDeleteWorkAdmin').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_URL}/works/${workId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        showMessageWorkAdmin('Trabajo eliminado exitosamente', 'success');
        document.body.removeChild(confirmModal);
        await loadAllWorksAdmin();
        await loadAdminOverview(); // Actualizar resumen general
      } else {
        const error = await response.json();
        showMessageWorkAdmin(error.message, 'error');
        document.body.removeChild(confirmModal);
      }
    } catch (error) {
      showMessageWorkAdmin('Error de conexión', 'error');
      document.body.removeChild(confirmModal);
    }
  });
}

// MOSTRAR MENSAJE EN SECCIÓN DE TRABAJO ADMIN
function showMessageWorkAdmin(text, type) {
  const messageEl = document.getElementById('messageWorkAdmin');
  if (!messageEl) {
    showMessage(text, type);
    return;
  }

  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;

  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 5000);
}