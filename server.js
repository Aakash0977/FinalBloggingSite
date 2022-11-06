const express = require('express');
const app = express();
const ejs = require('ejs');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const {pool} = require('./dbConfig');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service:"hotmail",
    auth:{
        user:"nodetest0977@hotmail.com",
        pass: process.env.MAIL_PASSWORD
    }
});

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

app.get ('/', (req, res) => {
    res.render('index');
});

app.get ('/home',checkNotAuthenticated, async (req, res) => {
    const allBlogPost = await pool.query(`SELECT b.ID,title,post,to_char(created_date,'yyyy-MM-dd') created_date,
    to_char(updated_date,'yyyy-MM-dd') updated_date,
    (Select count(1) from tbl_blog_like where blog_id=b.ID) LikeCount,
	(Select count(1) from tbl_blog_comment where blog_id=b.ID) CommentCount,
    coalesce((Select 'y' from tbl_blog_like where blog_id=b.ID and user_id= $1),'n') is_liked
    FROM tbl_blog b`,[req.user.id]);
    
    const allBlogComment = await pool.query(`Select c.ID,blog_id,comment,user_id,u.name
	from tbl_blog_comment c
	left join users u on u.ID=c.user_id`);
    res.render('home',  {user: req.user, posts: allBlogPost.rows, comments:allBlogComment.rows});
});

app.post ('/home',checkNotAuthenticated, async (req, res) => {
    const allBlogPost = await pool.query(`SELECT b.ID,title,post,to_char(created_date,'yyyy-MM-dd') created_date,
    to_char(updated_date,'yyyy-MM-dd') updated_date,
    (Select count(1) from tbl_blog_like where blog_id=b.ID) LikeCount,
	(Select count(1) from tbl_blog_comment where blog_id=b.ID) CommentCount,
    coalesce((Select 'y' from tbl_blog_like where blog_id=b.ID and user_id= $2),'n') is_liked
    FROM tbl_blog b
    where lower(title) like lower($1)`,["%"+req.body.search+"%",req.user.id]);
    
    const allBlogComment = await pool.query(`Select c.ID,blog_id,comment,user_id,u.name name
	from tbl_blog_comment c
	left join users u on u.ID=c.user_id`);
    
    res.render('home',  {user: req.user, posts: allBlogPost.rows, comments: allBlogComment.rows});
});

app.get ('/register', checkAuthenticated, (req, res) => {
    res.render('register');
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
                    `INSERT INTO users (name, email, password, is_admin) 
                    VALUES ($1, $2, $3, false)
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


app.get ('/login',checkAuthenticated, (req, res) => {
    res.render('login');
});

app.post("/login", passport.authenticate('local', {
    successRedirect:"/home",
    failureRedirect:"/login",
    failureFlash:true 
    }),(req, res)=>{
        res.next();
    }
);

app.get ('/profile', checkNotAuthenticated, (req, res) => {
    const str = req.user;
    res.render('profile', {user: str});
});

app.post('/profile', async (req, res) => {
    let {userid,name, email, password, password2 } = req.body;
    console.log({userid, name, email, password, password2});
    
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
        res.render("profile", {errors})
    }else{
        //form validation has passed

        let hashedPassword = await bcrypt.hash(password,10);
        console.log(hashedPassword);

        pool.query(`SELECT * FROM users WHERE id <> $1 and email=$2`, [userid,email],
        (err, results)=> {
            if (err) {
                throw err;
            }console.log(results.rows);

            if (results.rows.length > 0) {
                errors.push({message:"Email already exists"})
                res.render('profile',{errors});
            }else{
                pool.query(
                    `Update users set name=$1, email=$2, password=$3 
                    where id=$4
                    RETURNING id, password`,
                    [name,email,hashedPassword,userid],
                    (err, results) => {
                        if (err) {
                            throw err
                        }
                        console.log(results.rows);
                        req.flash("success_msg", "Your account has been successfully updated");
                        res.redirect('/profile');
                    }
                )
            }
        });
    }

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

//post comments
app.post('/comment', checkNotAuthenticated,(req, res) => {

        pool.query(`Insert into tbl_blog_comment(blog_id,user_id,comment,created_date,updated_date)
        values ($1,$2,$3,now(),now())`,[req.body.blogId, req.user.id, req.body.comments])
        res.redirect('/home');

        const options ={
            from:"nodetest0977@hotmail.com",
            to:"aakash0977@gmail.com",
            subject:"Sending test email",
            text: req.user.name+" commented "+ "'" + req.body.comments + "' " + "on blog '" + req.body.blogTitle+"'"
        }
        transporter.sendMail(options, (err,info)=>{
            if(err){
                console.log(err);
                return;
            }
            console.log("Mail sent")
        })
});

app.get('/comment/:blogId',checkNotAuthenticated, async (req, res) => {
    const allBlogPost = await pool.query(`SELECT b.ID,title,post,to_char(created_date,'yyyy-MM-dd') created_date,
    to_char(updated_date,'yyyy-MM-dd') updated_date,
    (Select count(1) from tbl_blog_like where blog_id=b.ID) LikeCount,
	(Select count(1) from tbl_blog_comment where blog_id=b.ID) CommentCount,
    coalesce((Select 'y' from tbl_blog_like where blog_id=b.ID and user_id= $1),'n') is_liked
    FROM tbl_blog b where id=$2`,[req.user.id,req.params.blogId]);
    
    const allBlogComment = await pool.query(`Select c.ID,blog_id,comment,user_id,u.name
	from tbl_blog_comment c
	left join users u on u.ID=c.user_id
    where blog_id=$1`,[req.params.blogId]);

    res.render('post',  {user: req.user, posts: allBlogPost.rows, comments: allBlogComment.rows});
})

app.get('/like/:blogId',checkNotAuthenticated, async (req, res) => {
    const is_liked = (await pool.query(`Select 'm' from tbl_blog_like where user_id=$2 and blog_id=$1`,[req.params.blogId, req.user.id]))
    if(is_liked.rowCount > 0){
        await pool.query(`Delete from tbl_blog_like where blog_id=$1 and user_id=$2`,[req.params.blogId, req.user.id])
    }
    else{
        await pool.query(`Insert into tbl_blog_like(blog_id,user_id,created_date,updated_date)
        values
        ($1,$2,now(),now())`,[req.params.blogId, req.user.id])
    }
    res.redirect('/home');
})

app.get('/delcomment/:blogId/:commentId',checkNotAuthenticated, (req, res) => {
    pool.query(`Delete from tbl_blog_comment where id=$1 and user_id=$2`,[req.params.commentId,req.user.id])
    res.redirect('/comment/'+req.params.blogId);
})

app.get ('/adminlogin', (req, res) => {
    res.render('adminLogin');
});

app.post ('/adminlogin', passport.authenticate('local', {
    successRedirect:"/adminhome",
    failureRedirect:"/adminlogin",
    failureFlash:true 
}), (req, res) =>{
    next();
});

app.get ('/adminhome', checkNotAuthenticatedAdmin,  async (req, res) => {
    const allBlogPost = await pool.query(`SELECT b.ID,title,post,to_char(created_date,'yyyy-MM-dd') created_date,
    to_char(updated_date,'yyyy-MM-dd') updated_date,
    (Select count(1) from tbl_blog_like where blog_id=b.ID) LikeCount,
	(Select count(1) from tbl_blog_comment where blog_id=b.ID) CommentCount
    FROM tbl_blog b`);
    
    const allBlogComment = await pool.query(`Select c.ID,blog_id,comment,user_id,u.name
	from tbl_blog_comment c
	left join users u on u.ID=c.user_id`);
    res.render('adminHome',  {posts: allBlogPost.rows, comments: allBlogComment.rows});
});

app.get ('/addblog', checkNotAuthenticatedAdmin, (req, res) => {
    res.render('addBlog');
});



app.post('/addBlog', async (req, res) => {
    pool.query(`INSERT INTO public.tbl_blog(
        title, post, created_date, updated_date)
        VALUES ( $1, $2, now(), now());`,[req.body.title,req.body.post]);
        res.redirect('/adminhome');
});

app.get('/editBlog/:blogId', async (req, res) =>{
    const BlogPost = await pool.query(`Select * from tbl_blog where id=$1`,[req.params.blogId]);
    res.render('editBlog',  {editpost: BlogPost.rows[0]});
}
);

app.post('/editBlog', async (req, res) => {
    await pool.query(`Update tbl_blog set title=$1, post=$2 where id=$3 `,[req.body.title,req.body.post,req.body.blogId])
    res.redirect('/adminhome');
});

app.get('/deleteBlog/:blogId', async (req, res) => {
    await pool.query(`Delete from tbl_blog where id=$1 `,[req.params.blogId])
    res.redirect('/adminhome');
});

app.get('/admincomment/:blogId', checkNotAuthenticatedAdmin, async (req, res) => {
    const allBlogPost = await pool.query(`SELECT b.ID,title,post,to_char(created_date,'yyyy-MM-dd') created_date,
    to_char(updated_date,'yyyy-MM-dd') updated_date,
    (Select count(1) from tbl_blog_like where blog_id=b.ID) LikeCount,
	(Select count(1) from tbl_blog_comment where blog_id=b.ID) CommentCount
    FROM tbl_blog b where id=$1`,[req.params.blogId]);
    
    const allBlogComment = await pool.query(`Select c.ID,blog_id,comment,user_id,u.name
	from tbl_blog_comment c
	left join users u on u.ID=c.user_id
    where blog_id=$1`,[req.params.blogId]);

    res.render('adminpost',  {user: req.user, posts: allBlogPost.rows, comments: allBlogComment.rows});
})

app.get('/admindelcomment/:blogId/:commentId', (req, res) => {
    pool.query(`Delete from tbl_blog_comment where id=$1`,[req.params.commentId])
    res.redirect('/admincomment/'+req.params.blogId);
})

app.get('/userdetails',checkNotAuthenticatedAdmin, async (req,res)=>{
    const allusers = await pool.query(`SELECT id, name, email, password
	FROM public.users `);
    res.render('userDetails',{posts:allusers.rows});
})

app.get('/deluser/:userId', (req, res) => {
    pool.query(`Delete from users where id=$1`,[req.params.userId])
    res.redirect('/userdetails');
})

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

function checkNotAuthenticatedAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/adminlogin');
}

app.listen(PORT, ()=> {
    console.log("Server started at port ${PORT}");
})