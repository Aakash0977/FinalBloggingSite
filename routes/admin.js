const express = require('express');
const passport = require('passport');
const {pool} = require('../dbConfig');

const data = require('./session');

const router = express.Router();

router.use(data);

//admin
router.get ('/adminlogin', (req, res) => {
    res.render('adminLogin');
});

router.post ('/adminlogin', passport.authenticate('local', {
    successRedirect:"/adminhome",
    failureRedirect:"/adminlogin",
    failureFlash:true 
}), (req, res) =>{
    next();
});

router.get ('/adminhome', checkNotAuthenticatedAdmin,  async (req, res) => {
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

router.get ('/addblog', checkNotAuthenticatedAdmin, (req, res) => {
    res.render('addBlog');
});

router.post('/addBlog', async (req, res) => {
    pool.query(`INSERT INTO public.tbl_blog(
        title, post, created_date, updated_date)
        VALUES ( $1, $2, now(), now());`,[req.body.title,req.body.post]);
        res.redirect('/adminhome');
});

router.get('/editBlog/:blogId', async (req, res) =>{
    const BlogPost = await pool.query(`Select * from tbl_blog where id=$1`,[req.params.blogId]);
    res.render('editBlog',  {editpost: BlogPost.rows[0]});
}
);

router.post('/editBlog', async (req, res) => {
    await pool.query(`Update tbl_blog set title=$1, post=$2 where id=$3 `,[req.body.title,req.body.post,req.body.blogId])
    res.redirect('/adminhome');
});

router.get('/deleteBlog/:blogId', async (req, res) => {
    await pool.query(`Delete from tbl_blog where id=$1 `,[req.params.blogId])
    res.redirect('/adminhome');
});

router.get('/admincomment/:blogId', checkNotAuthenticatedAdmin, async (req, res) => {
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

router.get('/admindelcomment/:blogId/:commentId', (req, res) => {
    pool.query(`Delete from tbl_blog_comment where id=$1`,[req.params.commentId])
    res.redirect('/admincomment/'+req.params.blogId);
})

router.get('/userdetails',checkNotAuthenticatedAdmin, async (req,res)=>{
    const allusers = await pool.query(`SELECT id, name, email, password
	FROM public.users where is_admin= false order by name `);
    res.render('userDetails',{posts:allusers.rows});
})

router.get('/deluser/:userId', (req, res) => {
    pool.query(`Delete from users where id=$1`,[req.params.userId])
    res.redirect('/userdetails');
})

router.get('/adminlogout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
          res.status(400).send('Unable to log out')
        } else {
            res.redirect('/adminlogin');
        }
      });

});

function checkNotAuthenticatedAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/adminlogin');
}

module.exports = router;