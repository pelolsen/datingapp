if (process.env.Node_ENV !== 'production') {
    require('dotenv').config()
}
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./database');
}
const express = require('express');
const app = express();
const bcrypt = require('bcrypt')
const passport = require("passport")
const flash = require("express-flash")
const sessions = require("express-session")
const methodOverride = require("method-override")
const http = require("http")
const formidable = require("formidable")
const fs = require('fs')
const multer = require('multer')
const path = require("path")

const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: function(req, file, cb){
        cb(null, file.originalname)
    }

})
const upload = multer({storage: storage}).single('UserFile');


const initializePassport = require("./passport-config");
const { use } = require('passport');
initializePassport(
    passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

const users_json_obj = []
const users = []

app.set("view-engine", "ejs")
app.use('/public', express.static('public'))

app.use(express.urlencoded({extended: false}))

app.use(flash())

app.use(sessions({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get("/", checkAuthenticated, (req,res)=> {
    res.render("index.ejs", { name: req.user.name, age: req.user.age, gender: req.user.gender, picture: req.user.picture})
})

app.get("/match", checkAuthenticated, (req,res) =>{
    res.render("match.ejs")
})

app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login.ejs")
})

app.post("/login", checkNotAuthenticated,  passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}))

app.get("/try", checkNotAuthenticated, (req,res)=> {
    res.render("try.ejs")
})

app.post("/try", (req,res) =>{
    upload(req, res, (err) =>{
        if(err){
            res.redirect('/register')
        }else{
            console.log(req.file);
            res.send('test')
        }
    })
})

app.get("/register", checkNotAuthenticated, (req,res)=> {
    res.render("register.ejs")
})

app.post("/register", checkNotAuthenticated, async (req,res) => {
    try{
        //encrypt the Uses password, so "we" cant see it
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const person ={
            id: Date.now().toString(),
            name: req.body.name,
            age: req.body.age,
            gender: req.body.gender,
            picture: './public/uploads/'+req.body.UserFile,
            email: req.body.email,
            password: hashedPassword
        }
        users.push(person)
        /*
        console.log('0');
        const form = formidable();
        console.log(form);
        form.parse(req, function (err, fields, files) {
            console.log('1')
            var oldpath = files.filetoupload.path;
            var newpath = 'database/images/'+files.filetoupload.name;
            fs.rename(oldpath, newpath, function (err) {
                if (err) throw err;
                res.write('File uploaded and moved!');
                res.end();
            });
        });
        console.log(form);
        */

        //if all the above is right, than redirect the user to login page
        res.redirect("/login")
        
    }catch{
        //if for some reason there is a failure, redirect back to register
        res.redirect("/register")
    }
    //if there is user that is added, it is possible to see ind the console
    //console.log(users)
                
      //aqui salva o json em forma de string no nosso "localStorage"
      localStorage.setItem('users',JSON.stringify(users));
      //console.log(localStorage.getItem('users'));
  
      //pega os usuarios que é um json string e transforma de volta em array para ser manipulado
      users_json_obj.push(JSON.parse(localStorage.getItem('users')));
      //console.log(users_json_obj)
      //console.log(users_json_obj[0]['id'])
})

app.delete('/logout', async (req,res) => {
    req.logOut()
    res.redirect('/login')
})
app.post('/deleteuser', (req,res) => {
    try{
        const id1=req.user.id
        const usersfind = JSON.parse(localStorage.getItem('users'));
        const findUserid = (usersfind, id1) =>{
            for(i=0; i < usersfind.length; i++){
                if(usersfind[i]['id'] === id1){
                    usersfind.splice(i,1);
                    console.log(usersfind)
                    return usersfind
                }
            }
        }
        users.splice(0, users.length)
        users.push(...findUserid(usersfind,id1))
        req.logOut()
        res.redirect("/login")

    }catch{
        res.redirect("/register")
    }
    localStorage.clear();
    localStorage.setItem('users',JSON.stringify(users));
    console.log(localStorage.getItem('users'));
    
})

function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}


app.listen(3000);
