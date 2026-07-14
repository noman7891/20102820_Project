const Product = require('../models/product');

// @desc    Get all products (with optional filtering, search, and sorting)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { search, category, sort } = req.query;
    const query = {};

    if (search) {
      const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.name = { $regex: escapedSearch, $options: 'i' };
    }

    if (category && category !== 'all' && category.trim() !== '') {
      query.category = category.trim();
    }

    let apiQuery = Product.find(query);

    // Apply sorting
    if (sort === 'price_asc') {
      apiQuery = apiQuery.sort({ price: 1 });
    } else if (sort === 'price_desc') {
      apiQuery = apiQuery.sort({ price: -1 });
    } else {
      // Default: newest first
      apiQuery = apiQuery.sort({ createdDate: -1 });
    }

    const products = await apiQuery;
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Public
const createProduct = async (req, res, next) => {
  try {
    const { name, category, brand, price, quantity, description } = req.body;
    const product = await Product.create({
      name,
      category,
      brand,
      price,
      quantity,
      description,
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product by ID
// @route   PUT /api/products/:id
// @access  Public
const updateProduct = async (req, res, next) => {
  try {
    const { name, category, brand, price, quantity, description } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    product.name = name;
    product.category = category;
    product.brand = brand;
    product.price = price;
    product.quantity = quantity;
    product.description = description;

    const updatedProduct = await product.save();
    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product by ID
// @route   DELETE /api/products/:id
// @access  Public
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    await product.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
