const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/products', productRoutes);

// Error Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
