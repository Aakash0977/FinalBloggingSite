const LocalStrategy = require('passport-local').Strategy;;
const { pool } =   require('./dbConfig');
const bcrypt = require('bcrypt');

function initialize(passport1){
    const authenticateUser  = (email, password,  done)=>{
        pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email],(err, results)=> {
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

    passport1.use(new LocalStrategy({
        usernameField:"email",
        passwordField:"password",

    }, authenticateUser)
        );
    
    passport1.serializeUser((user, done)=> done(null, user.id));

    passport1.deserializeUser((id, done)=>{
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

// const authPage = (permissions) =>{
    
    
//     return (req, res, done) =>{
        
//         pool.query(
//             `SELECT * FROM users WHERE email = $1 and is_admin = $2`,
//             [req.body.email,permissions],(err, results)=> {
//                 if(err){
//                     throw err;
//                 }
//                 console.log(results.rows);
//                 if (results.rows.length > 0){
//                     const user = results.rows[0];
                    
//                     bcrypt.compare(req.body.password, user.password, (err, isMatch)=>{
//                         if (err){
//                             throw err
//                         }
//                         if (isMatch){
//                             return done(null, user);
//                         }else{
//                             return done(null, false, {message: "Passwords do not match"});
//                         }
//                     });
//                 }else{
//                     return done(null, false, {message: "Email is not registered"});
//                 }
//             }
//         );
//     }
// }


module.exports = {initialize};

