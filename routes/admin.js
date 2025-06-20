const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

// Ensure user is authenticated and is an admin
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    res.redirect('/dashboard');
}

// Admin dashboard
router.get('/', ensureAdmin, async (req, res) => {
    try {
        // Get counts for dashboard
        const userCount = await User.countDocuments({ role: 'user' });
        const packageCount = await Package.countDocuments();
        const activeUserCount = await User.countDocuments({ 
            activePackage: { $ne: null },
            packageExpiryDate: { $gt: new Date() }
        });
        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
        
        // Get recent payments
        const recentPayments = await Payment.find({ status: 'completed' })
            .populate('user', 'name email')
            .populate('package', 'name price')
            .sort({ transactionDate: -1 })
            .limit(5);
        
        res.render('admin/dashboard', {
            userCount,
            packageCount,
            activeUserCount,
            revenue,
            recentPayments
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading admin dashboard');
        res.redirect('/dashboard');
    }
});

// Manage packages
router.get('/packages', ensureAdmin, async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: -1 });
        res.render('admin/packages', { packages });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching packages');
        res.redirect('/admin');
    }
});

// Manage users
router.get('/users', ensureAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .populate('activePackage', 'name')
            .sort({ createdAt: -1 });
        
        res.render('admin/users', { users });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching users');
        res.redirect('/admin');
    }
});

// View user details
router.get('/users/:id', ensureAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('activePackage', 'name price duration');
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }
        
        // Get user's payment history
        const payments = await Payment.find({ user: user._id })
            .populate('package', 'name price')
            .sort({ transactionDate: -1 });
        
        res.render('admin/user-details', { user, payments });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching user details');
        res.redirect('/admin/users');
    }
});

// Edit user
router.get('/users/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }
        
        res.render('admin/edit-user', { user });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching user');
        res.redirect('/admin/users');
    }
});

// Update user
router.post('/users/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;
        
        await User.findByIdAndUpdate(req.params.id, {
            name,
            email,
            phone,
            role
        });
        
        req.flash('success_msg', 'User updated successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating user');
        res.redirect(`/admin/users/edit/${req.params.id}`);
    }
});

// Delete user
router.post('/users/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        
        // Delete associated payments
        await Payment.deleteMany({ user: req.params.id });
        
        req.flash('success_msg', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting user');
        res.redirect('/admin/users');
    }
});

// Payment reports
router.get('/reports', ensureAdmin, async (req, res) => {
    try {
        // Get date range from query params or default to last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        // Get payments within date range
        const payments = await Payment.find({
            status: 'completed',
            transactionDate: { $gte: startDate, $lte: endDate }
        })
            .populate('user', 'name email')
            .populate('package', 'name price')
            .sort({ transactionDate: -1 });
        
        // Calculate total revenue
        const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Group payments by package
        const packageStats = await Payment.aggregate([
            { 
                $match: { 
                    status: 'completed',
                    transactionDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'package',
                    foreignField: '_id',
                    as: 'packageDetails'
                }
            },
            { $unwind: '$packageDetails' },
            {
                $group: {
                    _id: '$package',
                    packageName: { $first: '$packageDetails.name' },
                    count: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { revenue: -1 } }
        ]);
        
        res.render('admin/reports', {
            payments,
            totalRevenue,
            packageStats,
            startDate,
            endDate
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error generating reports');
        res.redirect('/admin');
    }
});

module.exports = router;
