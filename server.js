const express = require('express');
const app = express();
require('dotenv').config();

const userroutes = require('./routes/user');

const adminroutes = require('./routes/admin');

const PORT = process.env.PORT || 4000;

app.use(express.static("public"));

app.set('view engine','ejs');

app.use(express.urlencoded({extended:false}));

app.use(userroutes);

app.use(adminroutes);

//server port
app.listen(PORT, ()=> {
    console.log("Server started at port ${PORT}");
});

module.exports = app;