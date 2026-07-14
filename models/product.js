const mongoose = require('mongoose');

// --- MONGOOSE SCHEMATIC DEFINITION ---
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer (whole number)',
    },
  },
  description: {
    type: String,
    trim: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const ProductModel = mongoose.model('Product', productSchema);

// --- LOCAL IN-MEMORY REPOSITORY FALLBACK ---
const memoryStore = [];

class MemoryProduct {
  constructor(data) {
    this._id = data._id || new mongoose.Types.ObjectId().toString();
    this.name = data.name;
    this.category = data.category;
    this.brand = data.brand;
    this.price = Number(data.price);
    this.quantity = Number(data.quantity);
    this.description = data.description || '';
    this.createdDate = data.createdDate || new Date();
  }

  async save() {
    const idx = memoryStore.findIndex(p => p._id.toString() === this._id.toString());
    const dataToSave = {
      _id: this._id,
      name: this.name,
      category: this.category,
      brand: this.brand,
      price: this.price,
      quantity: this.quantity,
      description: this.description,
      createdDate: this.createdDate
    };
    if (idx !== -1) {
      memoryStore[idx] = dataToSave;
    } else {
      memoryStore.push(dataToSave);
    }
    return this;
  }

  async deleteOne() {
    const idx = memoryStore.findIndex(p => p._id.toString() === this._id.toString());
    if (idx !== -1) {
      memoryStore.splice(idx, 1);
    }
    return { deletedCount: 1 };
  }

  static async create(data) {
    const newProduct = new MemoryProduct(data);
    await newProduct.save();
    return newProduct;
  }

  static find(query = {}) {
    let results = [...memoryStore];

    if (query.name && query.name.$regex) {
      try {
        const regex = new RegExp(query.name.$regex, query.name.$options || 'i');
        results = results.filter(p => regex.test(p.name));
      } catch (e) {
        const term = query.name.$regex.replace(/\\/g, '').toLowerCase();
        results = results.filter(p => p.name.toLowerCase().includes(term));
      }
    }

    if (query.category) {
      results = results.filter(p => p.category.toLowerCase() === query.category.toLowerCase());
    }

    const chain = {
      sort: (sortQuery) => {
        if (sortQuery.price) {
          results.sort((a, b) => (a.price - b.price) * sortQuery.price);
        } else if (sortQuery.createdDate) {
          results.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        }
        return Promise.resolve(results);
      },
      then: (resolve) => resolve(results)
    };

    return chain;
  }

  static async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const castError = new Error('Cast Error');
      castError.name = 'CastError';
      castError.path = '_id';
      throw castError;
    }
    const found = memoryStore.find(p => p._id.toString() === id.toString());
    return found ? new MemoryProduct(found) : null;
  }

  static clear() {
    memoryStore.length = 0;
  }
}

// --- DYNAMIC DATA PROXY INTERCEPTOR ---
const isConnected = () => mongoose.connection.readyState === 1;

const ProductProxy = new Proxy({}, {
  get(target, prop) {
    if (isConnected()) {
      return ProductModel[prop];
    } else {
      return MemoryProduct[prop];
    }
  },
  construct(target, args) {
    if (isConnected()) {
      return new ProductModel(...args);
    } else {
      return new MemoryProduct(...args);
    }
  }
});

module.exports = ProductProxy;
