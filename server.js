const express = require('express');
const app = express();
const ejs = require('ejs');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const {pool} = require('./dbConfig');

const initializePassport = require('./passportConfig');
const { request } = require('http');
initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.use(express.static("public"));

app.set('view engine','ejs');

app.use(express.urlencoded({extended:false}));

app.use(session({
    secret : "secret",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(bodyParser.urlencoded({
    extended:true
}));

app.get ('/home',checkNotAuthenticated, (req, res) => {
    const str = req.user.name;
    const str2 = str.charAt(0).toUpperCase()+str.slice(1);
    res.render('home',  {user: str2});
});

app.get ('/', (req, res) => {
    res.render('index');
});

app.get ('/register', checkAuthenticated, (req, res) => {
    res.render('register');
});

app.get ('/login',checkAuthenticated, (req, res) => {
    res.render('login');
});

app.get ('/profile', checkNotAuthenticated, (req, res) => {
    const str = req.user.name;
    const str2 = str.charAt(0).toUpperCase()+str.slice(1);
    res.render('profile', {user: str2});
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
          res.status(400).send('Unable to log out')
        } else {
            res.redirect('/login');
        }
      });

});

app.post('/register', async (req, res) => {
    let {name, email, password, password2 } = req.body;
    console.log({name, email, password, password2});
    
    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({Message: "Please enter all the fields"})
    }

    if (password.length < 6){
        errors.push({message:"Password must be at least 6 characters"})
    }

    if (password != password2){
        errors.push({message:"Password do not match"})
    }

    if (errors.length > 0){
        res.render("register", {errors})
    }else{
        //form validation has passed

        let hashedPassword = await bcrypt.hash(password,10);
        console.log(hashedPassword);

        pool.query(`SELECT * FROM users WHERE email = $1`, [email],
        (err, results)=> {
            if (err) {
                throw err;
            }console.log(results.rows);

            if (results.rows.length > 0) {
                errors.push({message:"Email already exists"})
                res.render('register',{errors});
            }else{
                pool.query(
                    `INSERT INTO users (name, email, password) 
                    VALUES ($1, $2, $3)
                    RETURNING id, password`,
                    [name,email,hashedPassword],
                    (err, results) => {
                        if (err) {
                            throw err
                        }
                        console.log(results.rows);
                        req.flash("success_msg", "Your account has been successfully registered");
                        res.redirect('/login');
                    }
                )
            }
        });
    }

});

app.post("/login", passport.authenticate('local', {
    successRedirect:"/home",
    failureRedirect:"/login",
    failureFlash:true 
})
);

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/home');
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}


app.listen(PORT, ()=> {
    console.log("Server started at port ${PORT}");
})