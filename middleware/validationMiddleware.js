const validateProduct = (req, res, next) => {
  const { name, category, brand, price, quantity } = req.body;
  const errors = [];

  if (!name || name.trim() === '') {
    errors.push('Product name is required');
  }
  if (!category || category.trim() === '') {
    errors.push('Category is required');
  }
  if (!brand || brand.trim() === '') {
    errors.push('Brand is required');
  }

  // Price validation
  if (price === undefined || price === null || price === '') {
    errors.push('Price is required');
  } else {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      errors.push('Price must be a number');
    } else if (numPrice < 0) {
      errors.push('Price cannot be negative');
    }
  }

  // Quantity validation
  if (quantity === undefined || quantity === null || quantity === '') {
    errors.push('Quantity is required');
  } else {
    const numQuantity = Number(quantity);
    if (isNaN(numQuantity)) {
      errors.push('Quantity must be a number');
    } else if (numQuantity < 0) {
      errors.push('Quantity cannot be negative');
    } else if (!Number.isInteger(numQuantity)) {
      errors.push('Quantity must be a whole number (integer)');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    });
  }

  next();
};

module.exports = {
  validateProduct
};
