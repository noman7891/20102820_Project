const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Product = require('../models/product');

// Mock db connection to prevent actual connection timeout in tests
jest.mock('../config/db', () => {
  return jest.fn().mockResolvedValue(null);
});

describe('Product CRUD REST API Endpoints (In-Memory Database)', () => {
  
  beforeEach(() => {
    // Reset memory database state between tests
    Product.clear();
  });

  // Helper to create a dummy product
  const createDummyProduct = async (overrides = {}) => {
    return await Product.create({
      name: 'Test iPhone',
      category: 'Smartphones',
      brand: 'Apple',
      price: 999.99,
      quantity: 10,
      description: 'Test Description',
      ...overrides
    });
  };

  /* ==================== CREATE (POST) ==================== */
  describe('POST /api/products', () => {
    it('should create a new product when inputs are valid', async () => {
      const payload = {
        name: 'MacBook Air',
        category: 'Laptops',
        brand: 'Apple',
        price: 1199.00,
        quantity: 5,
        description: 'M3 Chip model'
      };

      const res = await request(app)
        .post('/api/products')
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.category).toBe(payload.category);
      expect(res.body.data.price).toBe(payload.price);
      expect(res.body.data.quantity).toBe(payload.quantity);
      expect(res.body.data.description).toBe(payload.description);
      expect(res.body.data._id).toBeDefined();

      // Check database directly
      const dbProduct = await Product.findById(res.body.data._id);
      expect(dbProduct).not.toBeNull();
      expect(dbProduct.name).toBe(payload.name);
    });

    it('should fail creation if required fields are missing', async () => {
      const invalidPayload = {
        category: 'Smartphones',
        brand: 'Samsung',
        price: 500,
        quantity: 10
      }; // Name missing

      const res = await request(app)
        .post('/api/products')
        .send(invalidPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toContain('Product name is required');
    });

    it('should fail creation if price is negative', async () => {
      const invalidPayload = {
        name: 'Cheap Phone',
        category: 'Smartphones',
        brand: 'Generic',
        price: -10,
        quantity: 10
      };

      const res = await request(app)
        .post('/api/products')
        .send(invalidPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toContain('Price cannot be negative');
    });

    it('should fail creation if quantity is negative or decimal', async () => {
      const resNegative = await request(app)
        .post('/api/products')
        .send({
          name: 'Negative Qty',
          category: 'Audio',
          brand: 'Sony',
          price: 99,
          quantity: -5
        });

      expect(resNegative.statusCode).toBe(400);
      expect(resNegative.body.errors).toContain('Quantity cannot be negative');

      const resDecimal = await request(app)
        .post('/api/products')
        .send({
          name: 'Decimal Qty',
          category: 'Audio',
          brand: 'Sony',
          price: 99,
          quantity: 2.5
        });

      expect(resDecimal.statusCode).toBe(400);
      expect(resDecimal.body.errors).toContain('Quantity must be a whole number (integer)');
    });
  });

  /* ==================== READ (GET) ==================== */
  describe('GET /api/products', () => {
    it('should fetch all products in database', async () => {
      await createDummyProduct({ name: 'Device A' });
      await createDummyProduct({ name: 'Device B' });

      const res = await request(app).get('/api/products');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter products by category', async () => {
      await createDummyProduct({ name: 'Phone X', category: 'Smartphones' });
      await createDummyProduct({ name: 'Laptop Y', category: 'Laptops' });

      const res = await request(app)
        .get('/api/products')
        .query({ category: 'Smartphones' });

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe('Phone X');
      expect(res.body.data[0].category).toBe('Smartphones');
    });

    it('should search products by name', async () => {
      await createDummyProduct({ name: 'Galaxy Ultra' });
      await createDummyProduct({ name: 'iPhone Pro' });

      const res = await request(app)
        .get('/api/products')
        .query({ search: 'galaxy' });

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe('Galaxy Ultra');
    });

    it('should sort products by price ascending/descending', async () => {
      await createDummyProduct({ name: 'Cheap', price: 100 });
      await createDummyProduct({ name: 'Medium', price: 500 });
      await createDummyProduct({ name: 'Expensive', price: 1000 });

      // Test ascending
      const resAsc = await request(app)
        .get('/api/products')
        .query({ sort: 'price_asc' });
      
      expect(resAsc.statusCode).toBe(200);
      expect(resAsc.body.data[0].name).toBe('Cheap');
      expect(resAsc.body.data[2].name).toBe('Expensive');

      // Test descending
      const resDesc = await request(app)
        .get('/api/products')
        .query({ sort: 'price_desc' });

      expect(resDesc.statusCode).toBe(200);
      expect(resDesc.body.data[0].name).toBe('Expensive');
      expect(resDesc.body.data[2].name).toBe('Cheap');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a single product by valid ID', async () => {
      const created = await createDummyProduct();

      const res = await request(app).get(`/api/products/${created._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(created.name);
    });

    it('should return 404 for non-existent product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/products/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app).get('/api/products/invalid-id-format');
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid field: _id');
    });
  });

  /* ==================== UPDATE (PUT) ==================== */
  describe('PUT /api/products/:id', () => {
    it('should update an existing product with valid inputs', async () => {
      const product = await createDummyProduct({ name: 'Old Name', quantity: 2 });
      const updateData = {
        name: 'New Name',
        category: 'Smartphones',
        brand: 'Apple',
        price: 899.99,
        quantity: 15,
        description: 'Updated spec'
      };

      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.quantity).toBe(15);

      // Check DB
      const dbProduct = await Product.findById(product._id);
      expect(dbProduct.name).toBe('New Name');
      expect(dbProduct.quantity).toBe(15);
    });

    it('should fail update with negative values', async () => {
      const product = await createDummyProduct();
      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .send({
          name: 'Updated Name',
          category: 'Smartphones',
          brand: 'Apple',
          price: -99,
          quantity: 10
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain('Price cannot be negative');
    });
  });

  /* ==================== DELETE (DELETE) ==================== */
  describe('DELETE /api/products/:id', () => {
    it('should delete an existing product', async () => {
      const product = await createDummyProduct();

      const res = await request(app).delete(`/api/products/${product._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify removal in DB
      const dbProduct = await Product.findById(product._id);
      expect(dbProduct).toBeNull();
    });

    it('should fail deletion for a non-existent product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/products/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
