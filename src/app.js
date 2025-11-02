const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const responseTrait = require('./middleware/responseTrait');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(responseTrait);

/**
 * Health check endpoint
 * Available at both /health and /api/health for compatibility
 */
const healthCheck = async (req, res) => {
  // Mongoose connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  if (dbState !== 1) {
    return res.error('Database not connected', 503, {
      status: 'unhealthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  }

  res.success('Server is running', {
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/competitions', require('./routes/competitions'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/points', require('./routes/points'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => {
  res.error('Route not found', 404);
});

app.use(errorHandler);

module.exports = app;

