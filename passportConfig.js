const LocalStrategy = require('passport-local').Strategy;;
const { pool } =   require('./dbConfig');
const bcrypt = require('bcrypt');

function initialize(passport){
const authenticateUser  = (req, email, password,  done)=>{
    console.log(req.body);
    req.body.is_admin = req.body.is_admin ? 1 : 0;
    console.log(req.body);
    pool.query(
        `SELECT * FROM users WHERE email = $1 and is_admin=$2`,
        [email,req.body.is_admin],(err, results)=> {
            if(err){
                throw err;
            }
            console.log(results.rows);
            if (results.rows.length > 0){
                const user = results.rows[0];
                
                bcrypt.compare(password, user.password, (err, isMatch)=>{
                    if (err){
                        throw err
                    }
                    if (isMatch){
                        return done(null, user);
                    }else{
                        return done(null, false, {message: "Passwords do not match"});
                    }
                });
            }else{
                return done(null, false, {message: "Email is not registered"});
            }
        }
    );
};

    passport.use(new LocalStrategy({
        usernameField:"email",
        passwordField:"password",
        passReqToCallback: true
    }, authenticateUser)
        );
    
    passport.serializeUser((user, done)=> done(null, user.id));

    passport.deserializeUser((id, done)=>{
        pool.query(
            `SELECT * FROM users WHERE id = $1`,[id], (err, results)=>{
                if (err){
                    throw err
                }
                return done(null, results.rows[0]);
            }
        )
    });
}

module.exports = initialize;