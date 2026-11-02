const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        logger.info('db.connected');
    } catch (error) {
        logger.error('db.connect_failed', { message: error.message });
        process.exit(1);
    }
};

module.exports = connectDB;
