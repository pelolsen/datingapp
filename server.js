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
const fs = require('fs')
const multer = require('multer')
const path = require("path")

const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: function(req, file, cb){
        //I use Date.now so I'm sure that there is no pictures with the same name
        cb(null, Date.now().toString() + file.originalname)
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
const users =[]
const users_json_obj = []

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
    res.render("index.ejs", { name: req.user.name, age: req.user.age, gender: req.user.gender, picture: req.user.picture, matches: req.user.matches})
})

function checkPossible(possibilities,id){
    for(i=0; i < possibilities.length; i++){
        if(possibilities[i]['id']===id){
            return false;
        }
    }

    return true
}

function findUserposibilities(possibilities,usersfind,id1,usergender){    

    for(i=0; i < usersfind.length; i++){
        user_return = '';

        if(usersfind[i]['id'] !== id1 && usersfind[i]['gender'] !== usergender && checkPossible(possibilities,usersfind[i]['id'])){
            console.log(usersfind[i]['gender']);
            console.log(usergender)
            possibilities.push(usersfind[i]['id']);
            user_return = usersfind[i];
            break;
        }
    }

    return user_return;
}      
  
   
app.get("/match", checkAuthenticated, (req,res) =>{
    try{
        //aqui creio que o correto seria usar tipo uma sessionStorage pra o usuario logado,mas esta funcionando assim não sei como kk.
        const id1=req.user.id

        console.log('req user id: '+id1);

        const usergender = req.user.gender
        const possibilities = req.user.possibilities
        const usersfind = JSON.parse(localStorage.getItem('users'));
        
        //procura 1 usuario
        user_find = findUserposibilities(possibilities,usersfind,id1,usergender);
        //renderiza a tela com o usuario encontrado
        res.render("match.ejs", {id: user_find.id,name: user_find.name,picture: user_find.picture, age: user_find.age});

        //Reesscrever localstorage
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

    }catch{   

    }    
})

app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login.ejs")
})
app.get("/register", checkNotAuthenticated, (req,res)=> {
    res.render("register.ejs")
})
app.get("/updateprofile", checkAuthenticated, (req,res)=> {
    res.render("updateprofile.ejs")
})


app.post("/login", checkNotAuthenticated,  passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}))   

app.post("/register", checkNotAuthenticated, async (req,res) => {
    try{
        //encrypt the Uses password, so "we" cant see it
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const person ={
            id: Date.now().toString(),
            name: req.body.name,
            age: req.body.age,
            gender: req.body.gender,
            picture: './public/uploads/',
            email: req.body.email,
            password: hashedPassword,
            possibilities: [],
            likes: [],
            dislikes: [],
            matches: []
        }
        users.push(person)
   
        //if all the above is right, than redirect the user to login page
        res.redirect("/login")
        
    }catch{
        //if for some reason there is a failure, redirect back to register
        res.redirect("/register")
    }
    //if there is user that is added, it is possible to see ind the console
    //console.log(users)
                
      //here it is save to the "localStorage"
      localStorage.setItem('users',JSON.stringify(users));
      //console.log(localStorage.getItem('users'));
  
      //pega os usuarios que é um json string e transforma de volta em array para ser manipulado
      users_json_obj.push(JSON.parse(localStorage.getItem('users')));
      //console.log(users_json_obj)
      //console.log(users_json_obj[0]['id'])
})

//This is the post command for making the user uptade it's profile picture
app.post("/pictureuptade", checkAuthenticated, (req,res) =>{
    try{
        upload(req, res, (err) =>{
            if(err){
                res.redirect('/register')
            }else{
                console.log(req.file);
                const id1=req.user.id
                const usersfind = JSON.parse(localStorage.getItem('users'));
                const switchUserpic = (usersfind, id1) =>{
                    for(i=0; i < usersfind.length; i++){
                        if(usersfind[i]['id'] === id1){
                            usersfind[i]['picture'] = './public/uploads/' + req.file.filename;
                            return usersfind
                        }
                    }
                }
                users.splice(0, users.length)
                users.push(...switchUserpic(usersfind,id1))
                localStorage.clear();
                localStorage.setItem('users',JSON.stringify(users));
        
                res.redirect('/')
            }
        })
    } catch {
        res.redirect('/')
    }
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

app.post("/updateprofile", checkAuthenticated, (req,res) =>{
    try{
        const id1=req.user.id
        const usersfind = JSON.parse(localStorage.getItem('users'));
        const UptadeUser = (usersfind, id1) =>{
            for(i=0; i < usersfind.length; i++){
                if(usersfind[i]['id'] === id1){
                    usersfind[i]['name'] = req.body.name;
                    usersfind[i]['age'] = req.body.age;
                    usersfind[i]['gender'] = req.body.gender;
                    usersfind[i]['email'] = req.body.email;
                    return usersfind
                }
            }
        }
        users.splice(0, users.length)
        users.push(...UptadeUser(usersfind,id1))
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

        res.redirect('/')
    } catch {
        res.redirect('/')
    }
})

app.post('/match', checkAuthenticated, (req,res) =>{
    res.redirect('/match')
})

function test_match(usersfind, id1, liked_id, matches){
    for(i=0; i<usersfind.length; i++){
        if(liked_id === usersfind[i]['id']){
            if(usersfind[i]['likes'].includes(id1)){
                console.log('match');
                matches.push(usersfind[i]['name']);
            }
        }
    }
}

app.post('/like', checkAuthenticated, (req,res) => {
    try{    
        console.log('req = '+req);
        liked_id = req.body.id;
        console.log('liked id: '+liked_id);  

        //aqui creio que o correto seria usar tipo uma sessionStorage pra o usuario logado,mas esta funcionando assim não sei como kk.
        const id1 = req.user.id
        const usergender = req.user.gender
        const possibilities = req.user.possibilities
        const matches = req.user.matches
        const usersfind = JSON.parse(localStorage.getItem('users'));



        const userlike = req.user.likes;
        userlike.push(liked_id);



        //aqui vc iniciara uma funcao que fara o teste de Match!
        test_match(usersfind, id1, liked_id, matches);
        console.log(users)
        

        //Aqui recomeçamos o processo de trazer a lista de usuarios
        //procura 1 usuario
        user_find = findUserposibilities(possibilities,usersfind,id1,usergender);
        //renderiza a tela com o usuario encontrado
        
        console.log('console log antes do render');  
        res.render("match.ejs", {id: user_find.id,name: user_find.name,picture: user_find.picture, age: user_find.age});
        console.log('console log depois do render');

        //Reesscrever localstorage
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

    } catch{
        res.redirect('/')
    }
})
app.post('/dislike', checkAuthenticated, (req,res) => {
    try{    
        disliked_id = req.body.id;
        console.log('liked id: '+liked_id);  

        //aqui creio que o correto seria usar tipo uma sessionStorage pra o usuario logado,mas esta funcionando assim não sei como kk.
        const id1 = req.user.id
        const usergender = req.user.gender
        const possibilities = req.user.possibilities
        const usersfind = JSON.parse(localStorage.getItem('users'));



        const userdislike = req.user.dislikes;
        userdislike.push(disliked_id);
        console.log(users)
        //Aqui recomeçamos o processo de trazer a lista de usuarios
        //procura 1 usuario
        user_find = findUserposibilities(possibilities,usersfind,id1,usergender);
        //renderiza a tela com o usuario encontrado
        
        console.log('console log antes do render');  
        res.render("match.ejs", {id: user_find.id,name: user_find.name,picture: user_find.picture, age: user_find.age});
        console.log('console log depois do render');

        //Reesscrever localstorage
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

    } catch{
        res.redirect('/')
    }
})

app.post('/noti', (req,res) => {
    app.alert('vai toma no cu')
})
app.delete('/logout', async (req,res) => {
    req.logOut()
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

