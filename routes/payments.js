const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
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

// M-Pesa credentials
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = process.env.MPESA_SHORTCODE;
const passkey = process.env.MPESA_PASSKEY;
const callbackUrl = process.env.MPESA_CALLBACK_URL;

// Get OAuth token for M-Pesa API
async function getOAuthToken() {
    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting OAuth token:', error);
        throw error;
    }
}

// Initiate STK Push
router.post('/stk-push', ensureAuthenticated, async (req, res) => {
    try {
        const { packageId, phoneNumber } = req.body;
        
        // Validate phone number format (should be 254XXXXXXXXX)
        const phoneRegex = /^254\d{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            req.flash('error_msg', 'Invalid phone number format. Use 254XXXXXXXXX');
            return res.redirect(`/packages/${packageId}`);
        }
        
        // Get package details
        const package = await Package.findById(packageId);
        if (!package) {
            req.flash('error_msg', 'Package not found');
            return res.redirect('/packages');
        }
        
        // Get OAuth token
        const token = await getOAuthToken();
        
        // Prepare timestamp
        const timestamp = moment().format('YYYYMMDDHHmmss');
        
        // Prepare password
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
        
        // Prepare STK push request
        const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        const data = {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: package.price,
            PartyA: phoneNumber,
            PartyB: shortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: `${callbackUrl}/payments/callback`,
            AccountReference: `HotspotKenya-${req.user._id}`,
            TransactionDesc: `Payment for ${package.name} package`
        };
        
        // Make STK push request
        const response = await axios.post(stkPushUrl, data, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        // Store checkout request ID in session for verification
        req.session.checkoutRequestId = response.data.CheckoutRequestID;
        req.session.packageId = packageId;
        
        req.flash('success_msg', 'Payment request sent to your phone. Please complete the payment.');
        res.redirect('/payments/status');
    } catch (error) {
        console.error('STK push error:', error);
        req.flash('error_msg', 'Error processing payment request');
        res.redirect('/packages');
    }
});

// Payment status page
router.get('/status', ensureAuthenticated, (req, res) => {
    res.render('payment-status', {
        checkoutRequestId: req.session.checkoutRequestId
    });
});

// M-Pesa callback endpoint
router.post('/callback', async (req, res) => {
    try {
        const { Body } = req.body;
        
        // Check if payment was successful
        if (Body.stkCallback.ResultCode === 0) {
            const callbackData = Body.stkCallback.CallbackMetadata.Item;
            
            // Extract payment details
            const amount = callbackData.find(item => item.Name === 'Amount').Value;
            const mpesaReceiptNumber = callbackData.find(item => item.Name === 'MpesaReceiptNumber').Value;
            const phoneNumber = callbackData.find(item => item.Name === 'PhoneNumber').Value;
            
            // Find user by account reference
            const accountRef = Body.stkCallback.CallbackData.AccountReference;
            const userId = accountRef.split('-')[1];
            
            const user = await User.findById(userId);
            if (!user) {
                console.error('User not found for payment:', userId);
                return res.status(400).json({ success: false });
            }
            
            // Find package
            const package = await Package.findById(req.session.packageId);
            if (!package) {
                console.error('Package not found for payment:', req.session.packageId);
                return res.status(400).json({ success: false });
            }
            
            // Create payment record
            const payment = new Payment({
                user: user._id,
                package: package._id,
                amount,
                mpesaReceiptNumber,
                phoneNumber: phoneNumber.toString(),
                status: 'completed'
            });
            
            await payment.save();
            
            // Update user's active package and expiry date
            user.activePackage = package._id;
            user.packageExpiryDate = moment().add(package.duration, 'days').toDate();
            await user.save();
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('M-Pesa callback error:', error);
        res.status(500).json({ success: false });
    }
});

// Check payment status
router.get('/check-status', ensureAuthenticated, async (req, res) => {
    try {
        const checkoutRequestId = req.session.checkoutRequestId;
        
        if (!checkoutRequestId) {
            return res.status(400).json({ success: false, message: 'No payment in progress' });
        }
        
        // Get OAuth token
        const token = await getOAuthToken();
        
        // Prepare timestamp
        const timestamp = moment().format('YYYYMMDDHHmmss');
        
        // Prepare password
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
        
        // Query payment status
        const statusUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';
        const data = {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };
        
        const response = await axios.post(statusUrl, data, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        // Check if payment was successful
        if (response.data.ResultCode === 0) {
            // Payment successful
            const payment = await Payment.findOne({ user: req.user._id }).sort({ transactionDate: -1 });
            
            if (payment && payment.status === 'completed') {
                delete req.session.checkoutRequestId;
                delete req.session.packageId;
                
                return res.json({ success: true, status: 'completed' });
            }
        }
        
        // Payment still pending or failed
        res.json({ success: true, status: 'pending' });
    } catch (error) {
        console.error('Check payment status error:', error);
        res.status(500).json({ success: false, message: 'Error checking payment status' });
    }
});

// Payment history
router.get('/history', ensureAuthenticated, async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .populate('package')
            .sort({ transactionDate: -1 });
        
        res.render('payment-history', { payments });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        req.flash('error_msg', 'Error fetching payment history');
        res.redirect('/dashboard');
    }
});

module.exports = router;
