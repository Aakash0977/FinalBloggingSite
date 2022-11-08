const express = require('express');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const bodyParser = require('body-parser');
const {pool} = require('../dbConfig');

const initializePassport = require('../passportConfig');
const { request } = require('http');
initializePassport(passport);

const router = express.Router();
router.use(session({
    secret : "secret",
    resave:false,
    saveUninitialized:false
}));

router.use(passport.initialize());
router.use(passport.session());

router.use(flash());
router.use(bodyParser.urlencoded({
    extended:true
}));

module.exports = router;