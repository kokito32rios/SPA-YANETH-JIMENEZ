// ====== server.js ======
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const workRoutes = require('./routes/workRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MIDDLEWARE - ORDEN IMPORTANTE ======
// 1. Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 2. CORS
app.use(cors());

// 3. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// 4. SESIÓN - ANTES DE LAS RUTAS!!!
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu-secret-super-seguro-cambia-esto-en-produccion-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true en Render (HTTPS)
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'lax'
    }
}));

// ====== RUTAS API (después de session) ======
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/works', workRoutes);

// ====== RUTAS HTML (después de todo) ======
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dashboard/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/dashboard/manicurist', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'manicurist-dashboard.html'));
});

app.get('/dashboard/client', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'client-dashboard.html'));
});

// 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html')); // opcional: crea un 404.html
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`📍 Accede en: https://horas-cole.onrender.com`);
});