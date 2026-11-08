const mongoose = require('mongoose');
const { logger, flush } = require('../utils/logger');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        logger.info('db.connected');
    } catch (error) {
        logger.error('db.connect_failed', { message: error.message });
        await flush(); // so the failure reaches Grafana too
        process.exit(1);
    }
};

module.exports = connectDB;
