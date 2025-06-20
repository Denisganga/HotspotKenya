const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

// Ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
}

// User profile
router.get('/profile', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('activePackage');
        res.render('profile', { user });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching profile');
        res.redirect('/dashboard');
    }
});

// Edit profile
router.get('/profile/edit', ensureAuthenticated, (req, res) => {
    res.render('edit-profile', { user: req.user });
});

// Update profile
router.post('/profile/edit', ensureAuthenticated, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        // Check if email is already taken by another user
        if (email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                req.flash('error_msg', 'Email is already in use');
                return res.redirect('/users/profile/edit');
            }
        }
        
        // Update user profile
        await User.findByIdAndUpdate(req.user._id, {
            name,
            email,
            phone
        });
        
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/users/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/users/profile/edit');
    }
});

// Change password
router.get('/change-password', ensureAuthenticated, (req, res) => {
    res.render('change-password');
});

// Update password
router.post('/change-password', ensureAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/users/change-password');
        }
        
        // Check if current password is correct
        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/users/change-password');
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        user.password = hashedPassword;
        await user.save();
        
        req.flash('success_msg', 'Password changed successfully');
        res.redirect('/users/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error changing password');
        res.redirect('/users/change-password');
    }
});

// User's active package
router.get('/active-package', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('activePackage');
        
        if (!user.activePackage || new Date() > user.packageExpiryDate) {
            req.flash('error_msg', 'You do not have an active package');
            return res.redirect('/packages');
        }
        
        res.render('active-package', { 
            package: user.activePackage,
            expiryDate: user.packageExpiryDate
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching active package');
        res.redirect('/dashboard');
    }
});

// User's payment history
router.get('/payment-history', ensureAuthenticated, async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .populate('package', 'name price')
            .sort({ transactionDate: -1 });
        
        res.render('payment-history', { payments });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching payment history');
        res.redirect('/dashboard');
    }
});

module.exports = router;
