if (process.env.Node_ENV !== 'production') {
    require('dotenv').config()
}
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./database');
}
//require everything I need
const express = require('express');
const app = express();
const bcrypt = require('bcrypt')
const passport = require("passport")
const flash = require("express-flash")
const sessions = require("express-session")
const methodOverride = require("method-override")
const multer = require('multer')
//Multer
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: function(req, file, cb){
        //I use Date.now so I'm sure that there is no pictures with the same name
        cb(null, Date.now().toString() + file.originalname)
    }
})
const upload = multer({storage: storage}).single('UserFile');
//Passport, require and use passport from passport config
const initializePassport = require("./passport-config");
const { use } = require('passport');
initializePassport(
    passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)
//Users array
const users =[]
//So I can use ejs to frontend
app.set("view-engine", "ejs")
//Make a public foldel so my css and pictures work
app.use('/public', express.static('public'))
//put the diffetent librarys at work
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
    
//.get is mostly used to render the ejs files
app.get("/", checkAuthenticated, (req,res)=> {
    res.render("index.ejs", { name: req.user.name, age: req.user.age, gender: req.user.gender, picture: req.user.picture, matches: req.user.matches})
})
//Check if the user already have been used
function checkPossible(possibilities,id){
    for(i=0; i < possibilities.length; i++){
        if(possibilities[i]['id']===id){
            return false;
        }
    }

    return true
}
//Find possibilities - problem with if statment.
function findUserposibilities(possibilities,usersfind,id1,usergender){    

    for(i=0; i < usersfind.length; i++){
        user_return = '';
//it is like it does not see the !==
        if(usersfind[i]['id'] !== id1 && usersfind[i]['gender'] !== usergender && checkPossible(possibilities,usersfind[i]['id'])){
            console.log(usersfind[i]['gender']);
            console.log(usergender)
            possibilities.push(usersfind[i]['id']);
            user_return = usersfind[i];
            break; //break so it doesnt throw all of the users at one time, but one at a time
        }
    }

    return user_return;
}      
  
   
app.get("/match", checkAuthenticated, (req,res) =>{
    try{
        const id1=req.user.id

        console.log('req user id: '+id1);

        const usergender = req.user.gender
        const possibilities = req.user.possibilities
        const usersfind = JSON.parse(localStorage.getItem('users'));
        
        //find the first user
        user_find = findUserposibilities(possibilities,usersfind,id1,usergender);
        //rerender the screen with the found user
        res.render("match.ejs", {id: user_find.id,name: user_find.name,picture: user_find.picture, age: user_find.age});

        //write to localStorage
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

    }catch{   
        res.redirect('/')
    }    
})

app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login.ejs")
})
app.get('/itsamatch', checkAuthenticated, (req,res)=>{
    res.render("itsamatch.ejs")
})
app.get("/register", checkNotAuthenticated, (req,res)=> {
    res.render("register.ejs")
})
app.get("/updateprofile", checkAuthenticated, (req,res)=> {
    res.render("updateprofile.ejs")
})

//Login process - working fine
app.post("/login", checkNotAuthenticated,  passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}))   

//register process - working fine
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
            possibilities: [], //will be used to push the possibilities to
            likes: [], //will be used to push the likes to
            dislikes: [], //will be used to push the dislikes to
            matches: [] //will be used to push the matches to
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
})

//This is the post command for making the user uptade it's profile picture
app.post("/pictureuptade", checkAuthenticated, (req,res) =>{
    try{
        upload(req, res, (err) =>{
            if(err){
                res.redirect('/')
            }else{
                //console.log(req.file);
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
// Delete User button
app.post('/deleteuser', (req,res) => {
    try{
        const id1=req.user.id
        const usersfind = JSON.parse(localStorage.getItem('users'));
        const findUserid = (usersfind, id1) =>{
            for(i=0; i < usersfind.length; i++){
                if(usersfind[i]['id'] === id1){
                    usersfind.splice(i,1); //splice so we delete the user from the array
                    console.log(usersfind)
                    return usersfind
                }
            }
        }
        users.splice(0, users.length) //delete all user array so we can substitue it with the elements of userfind array
        users.push(...findUserid(usersfind,id1))
        req.logOut()//log the user out
        res.redirect("/login")

    }catch{
        res.redirect("/register")
    }
    //update localStorage
    localStorage.clear();
    localStorage.setItem('users',JSON.stringify(users));
    //console.log(localStorage.getItem('users'));
    
})
//Uptade profine - no errors
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
        //same procedure as before
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
//test if it is a match
function test_match(usersfind, id1, liked_id, matches){
    for(i=0; i<usersfind.length; i++){
        if(liked_id === usersfind[i]['id']){
            if(usersfind[i]['likes'].includes(id1)){
                //console.log('match');
                matches.push(usersfind[i]['name']);
                return true //so we can use it later
            }
        }
    }
}

app.post('/like', checkAuthenticated, (req,res) => {
    try{    
        console.log('req = '+req);
        liked_id = req.body.id;
        console.log('liked id: '+liked_id);  

        const id1 = req.user.id
        const usergender = req.user.gender
        const possibilities = req.user.possibilities
        const matches = req.user.matches
        const usersfind = JSON.parse(localStorage.getItem('users'));
        const userlike = req.user.likes;
        
        userlike.push(liked_id);
        //Use test match, and if its true, render the itsamatch page
       if(test_match(usersfind, id1, liked_id, matches)){
           res.render('itsamatch.ejs')
       } else{
            //Restart the process of finding a possibility
            //Find a possible user
            user_find = findUserposibilities(possibilities,usersfind,id1,usergender);
            //re render the screen with the user
            //console.log('b render');  
            res.render("match.ejs", {id: user_find.id,name: user_find.name,picture: user_find.picture, age: user_find.age});
            //console.log('a render');
       }
        console.log(users)
        
        //Uptade localStorage localstorage
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

    } catch{
        res.redirect('/')
    }
})
//same proceduere as like, just with no test function
app.post('/dislike', checkAuthenticated, (req,res) => {
    try{    
        disliked_id = req.body.id;
        //console.log('liked id: '+liked_id);  

        const id1 = req.user.id
        const usergender = req.user.gender
        const possibilities = req.user.possibilities
        const usersfind = JSON.parse(localStorage.getItem('users'));



        const userdislike = req.user.dislikes;
        userdislike.push(disliked_id);
        console.log(users)
        //Restart the process of finding a possibility
        //Find a possible user
        user_find = findUserposibilities(possibilities,usersfind,id1,usergender);
        //rerender the screen with the user
        res.render("match.ejs", {id: user_find.id,name: user_find.name,picture: user_find.picture, age: user_find.age});

        //update localStorage
        localStorage.clear();
        localStorage.setItem('users',JSON.stringify(users));

    } catch{
        res.redirect('/')
    }
})
//logout
app.delete('/logout', async (req,res) => {
    req.logOut()
    res.redirect('/login')
})
//functions to check if user is authenticaded or not - no errors
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

//Listen on port 3000... "localhost:3000/"
app.listen(3000);

