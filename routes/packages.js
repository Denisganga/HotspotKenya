const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Package = require('../models/Package');

// Ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
}

// Ensure user is admin
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    res.redirect('/dashboard');
}

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './static/images/packages/');
    },
    filename: function(req, file, cb) {
        cb(null, 'package-' + Date.now() + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB max file size
});

// Get all packages
router.get('/', async (req, res) => {
    try {
        const packages = await Package.find({ isActive: true });
        res.render('packages', { packages });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching packages');
        res.redirect('/dashboard');
    }
});

// Get package details
router.get('/:id', async (req, res) => {
    try {
        const package = await Package.findById(req.params.id);
        if (!package) {
            req.flash('error_msg', 'Package not found');
            return res.redirect('/packages');
        }
        res.render('package-details', { package });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching package details');
        res.redirect('/packages');
    }
});

// Admin routes for package management
router.get('/admin/create', ensureAdmin, (req, res) => {
    res.render('admin/create-package');
});

router.post('/admin/create', ensureAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, duration, dataLimit, speed } = req.body;
        
        const newPackage = new Package({
            name,
            description,
            price,
            duration,
            dataLimit,
            speed,
            image: req.file ? `/images/packages/${req.file.filename}` : 'default-package.jpg'
        });

        await newPackage.save();
        req.flash('success_msg', 'Package created successfully');
        res.redirect('/admin/packages');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating package');
        res.redirect('/admin/packages/create');
    }
});

router.get('/admin/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const package = await Package.findById(req.params.id);
        if (!package) {
            req.flash('error_msg', 'Package not found');
            return res.redirect('/admin/packages');
        }
        res.render('admin/edit-package', { package });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching package');
        res.redirect('/admin/packages');
    }
});

router.post('/admin/edit/:id', ensureAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, duration, dataLimit, speed, isActive } = req.body;
        
        const package = await Package.findById(req.params.id);
        if (!package) {
            req.flash('error_msg', 'Package not found');
            return res.redirect('/admin/packages');
        }

        // Update package details
        package.name = name;
        package.description = description;
        package.price = price;
        package.duration = duration;
        package.dataLimit = dataLimit;
        package.speed = speed;
        package.isActive = isActive === 'on';

        // Update image if a new one is uploaded
        if (req.file) {
            // Delete old image if it's not the default
            if (package.image !== 'default-package.jpg') {
                const oldImagePath = path.join(__dirname, '../static', package.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            package.image = `/images/packages/${req.file.filename}`;
        }

        await package.save();
        req.flash('success_msg', 'Package updated successfully');
        res.redirect('/admin/packages');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating package');
        res.redirect(`/admin/packages/edit/${req.params.id}`);
    }
});

router.post('/admin/delete/:id', ensureAdmin, async (req, res) => {
    try {
        const package = await Package.findById(req.params.id);
        if (!package) {
            req.flash('error_msg', 'Package not found');
            return res.redirect('/admin/packages');
        }

        // Delete package image if it's not the default
        if (package.image !== 'default-package.jpg') {
            const imagePath = path.join(__dirname, '../static', package.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Package.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Package deleted successfully');
        res.redirect('/admin/packages');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting package');
        res.redirect('/admin/packages');
    }
});

module.exports = router;
