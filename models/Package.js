const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,  // Duration in days
        required: true
    },
    dataLimit: {
        type: Number,  // Data limit in MB
        required: true
    },
    speed: {
        type: String,  // Speed in Mbps
        required: true
    },
    image: {
        type: String,  // Path to the image
        default: 'default-package.jpg'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Package', PackageSchema);
