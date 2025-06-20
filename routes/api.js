const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const Payment = require('../models/Payment');

// Ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// Get popular packages
router.get('/packages/popular', async (req, res) => {
    try {
        // Get top 3 packages based on number of payments
        const popularPackages = await Payment.aggregate([
            { $group: { _id: '$package', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
        ]);
        
        const packageIds = popularPackages.map(item => item._id);
        
        // If there are no payments yet, get the latest packages
        let packages;
        if (packageIds.length === 0) {
            packages = await Package.find({ isActive: true })
                .sort({ createdAt: -1 })
                .limit(3);
        } else {
            packages = await Package.find({ 
                _id: { $in: packageIds },
                isActive: true
            });
            
            // Sort packages in the same order as packageIds
            packages.sort((a, b) => {
                return packageIds.indexOf(a._id) - packageIds.indexOf(b._id);
            });
        }
        
        res.json(packages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user activity
router.get('/users/activity', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get user's payments
        const payments = await Payment.find({ user: userId })
            .populate('package', 'name')
            .sort({ transactionDate: -1 })
            .limit(5);
        
        // Format activity data
        const activity = payments.map(payment => ({
            date: payment.transactionDate,
            type: 'Payment',
            details: `Paid KES ${payment.amount} for ${payment.package.name} package`
        }));
        
        res.json(activity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
