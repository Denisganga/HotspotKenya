const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Passport local strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return done(null, false, { message: 'Email not registered' });
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return done(null, false, { message: 'Password incorrect' });
        }
        
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

// Register page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('register');
});

// Register handle
router.post('/register', async (req, res) => {
    const { name, email, password, password2, phone } = req.body;
    let errors = [];

    // Check required fields
    if (!name || !email || !password || !password2 || !phone) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    // Check passwords match
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    // Check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            email,
            phone
        });
    } else {
        try {
            // Check if email exists
            const existingUser = await User.findOne({ email });
            
            if (existingUser) {
                errors.push({ msg: 'Email is already registered' });
                return res.render('register', {
                    errors,
                    name,
                    email,
                    phone
                });
            }

            // Create new user
            const newUser = new User({
                name,
                email,
                password,
                phone
            });

            await newUser.save();
            req.flash('success_msg', 'You are now registered and can log in');
            res.redirect('/login');
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'An error occurred during registration');
            res.redirect('/register');
        }
    }
});

// Login handle
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

// Logout handle
router.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/login');
    });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: req.user
    });
});

// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
}

module.exports = router;
