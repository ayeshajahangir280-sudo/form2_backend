const mongoose = require("mongoose");

let connectionPromise = null;
let lastConnectionError = null;

mongoose.set("bufferCommands", false);

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        dbName: process.env.MONGODB_DB_NAME || undefined,
      })
      .catch((error) => {
        lastConnectionError = error;
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
  lastConnectionError = null;
  return mongoose.connection;
}

function getDBStatus() {
  return {
    readyState: mongoose.connection.readyState,
    connected: mongoose.connection.readyState === 1,
    error: lastConnectionError?.message || null,
  };
}

module.exports = {
  connectDB,
  getDBStatus,
};
