const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const schemaRoutes = require('./routes/schema');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
}

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProduction, maxAge: 8 * 60 * 60 * 1000, sameSite: 'lax' },
}));

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use('/auth', authRoutes);
app.use('/api', schemaRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (isProduction) {
  app.use(express.static(path.resolve(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
