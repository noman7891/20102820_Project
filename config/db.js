const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_store';
    console.log(`Attempting database connection to: ${uri}`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000 // 2 seconds timeout to fail fast
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`\n================================================================`);
    console.error(`⚠️  MongoDB connection failed: ${error.message}`);
    console.error(`👉  FALLBACK: Running in local In-Memory Database Mode.`);
    console.error(`    All CRUD operations will work perfectly but will not persist.`);
    console.error(`================================================================\n`);
    return null;
  }
};

module.exports = connectDB;
