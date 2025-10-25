// Obtener formulario y elementos
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const messageEl = document.getElementById('message');

// ====== LOGIN ======
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validar campos
    if (!email || !password) {
      showMessage('Por favor completa todos los campos', 'error');
      return;
    }

    try {
      showMessage('Iniciando sesión...', 'info');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showMessage('¡Bienvenido! Redirigiendo...', 'success');

        // Redirigir según rol
        setTimeout(() => {
          redirectByRole(data.user.role_id);
        }, 1500);
      } else {
        showMessage(data.message || 'Error al iniciar sesión', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error de conexión con el servidor', 'error');
    }
  });
}

// ====== REGISTRO ======
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

    // Validaciones
    if (!firstName || !lastName || !email || !password) {
      showMessage('Por favor completa todos los campos obligatorios', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (password !== passwordConfirm) {
      showMessage('Las contraseñas no coinciden', 'error');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage('Por favor ingresa un email válido', 'error');
      return;
    }

    try {
      showMessage('Creando cuenta...', 'info');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone_number: phone || null,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success');

        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showMessage(data.message || 'Error al registrar usuario', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error de conexión con el servidor', 'error');
    }
  });
}

// ====== FUNCIONES AUXILIARES ======

// Mostrar mensajes
function showMessage(text, type) {
  if (!messageEl) return;

  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;

  // Auto-limpiar mensaje después de 5 segundos si es info
  if (type === 'info') {
    setTimeout(() => {
      messageEl.classList.remove('show');
    }, 5000);
  }
}

// Redirigir según rol
function redirectByRole(roleId) {
  const roleRedirects = {
    1: '/dashboard/admin',      // Administrador
    2: '/dashboard/manicurist', // Manicurista
    3: '/dashboard/client'      // Cliente
  };

  const redirectUrl = roleRedirects[roleId] || '/dashboard';
  window.location.href = redirectUrl;
}

// Verificar si hay sesión activa
function checkSession() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (token && user) {
    return JSON.parse(user);
  }

  return null;
}

// Cerrar sesión
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// Obtener token para peticiones
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}