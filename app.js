const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const packageRoutes = require('./routes/packages');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const apiRoutes = require('./routes/api');

// Initialize app
const app = express();

// Connect to MongoDB (commented out for demo)
// mongoose.connect(process.env.MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// .then(() => console.log('MongoDB Connected'))
// .catch(err => console.log(err));

console.log('MongoDB connection skipped for demo');

// Set up view engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/packages', packageRoutes);
app.use('/payments', paymentRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);
app.use('/api', apiRoutes);

// Home route
app.get('/', (req, res) => {
    res.render('demo');
});

// Demo routes for testing without MongoDB
app.get('/demo', (req, res) => {
    res.render('demo');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
