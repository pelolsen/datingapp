if (process.env.Node_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt')
const passport = require("passport")
const flash = require("express-flash")
const sessions = require("express-session")
const methodOverride = require("method-override")
const fs = require('fs')


const initializePassport = require("./passport-config")
initializePassport(
    passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)


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
    res.render("index.ejs", { name: req.user.name})
})

app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login.ejs")
})

app.post("/login", checkNotAuthenticated,  passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}))


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
            email: req.body.email,
            password: hashedPassword
        }
        users.push(person)
        //if all the above is right, than redirect the user to login page
        res.redirect("/login")
        
    }catch{
        //if for some reason there is a failure, redirect back to register
        res.redirect("/register")
    }
    //if there is user that is added, it is possible to see ind the console
    console.log(users)
    if (typeof localStorage === "undefined" || localStorage === null) {
        var LocalStorage = require('node-localstorage').LocalStorage;
        localStorage = new LocalStorage('./database');
      }
                
      //aqui salva o json em forma de string no nosso "localStorage"
      localStorage.setItem('users',JSON.stringify(users));
      console.log(localStorage.getItem('users'));
  
      //pega os usuarios que é um json string e transforma de volta em array para ser manipulado
      users_json_obj = JSON.parse(localStorage.getItem('users'));
      console.log(users_json_obj);
})

app.delete('/logout', (req,res) => {
    req.logOut()
    res.redirect('/login')
})
app.delete('/deleteuser', (req,res) => {
    for(i=0; i<users_json_obj.length; i++){
        if(users_json_obj[i][0] === id){
            users_json_obj.splice(i,1);
            return users_json_obj
        }
    }
    console.log(users_json_obj);
    res.redirect('/login')
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
