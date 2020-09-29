require('dotenv').config();
const express=require('express');
const bodyParser=require('body-parser');
const path=require('path');
// const bodyParser = require("body-parser");
const mongoose = require('mongoose');
// const md5=require('md5');
// const bcrypt=require('bcrypt');
// const saltRounds=10;
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate');
const FacebookStrategy=require('passport-facebook').Strategy;

const app=express();


mongoose.connect('mongodb://localhost/userDB',{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);

mongoose.connection;


app.use(bodyParser.urlencoded({extended:true}));
app.use('/static',express.static('static'));
app.use(session({
    secret:'This is Our little fucking secret',
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize());
app.use(passport.session());

const userSchema=mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
})



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=new mongoose.model('User',userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "https://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
      console.log(profile);
      User.findOrCreate({facebookId:profile.id}, function(err, user) {
        if (err) { return done(err); }
        done(null, user);
      });
  }
));

app.set('view engine','pug');
app.set('views',path.join(__dirname,'template'));

app.get('/',(req,res)=>{
    const params={};
    res.render('home.pug',params);
})

app.get('/auth/google', passport.authenticate('google',{scope:['profile']}));
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['profile'] })
);


app.get('/auth/google/secrets', 
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }));

app.get('/register',(req,res)=>{
    res.render('register.pug');
})
app.get('/login',(req,res)=>{
    res.render('login.pug');
})
app.get('/secrets',(req,res)=>{
    // if(req.isAuthenticated()){
    //     res.render('secrets.pug');
    // }
    // else{
    //     res.redirect('/login');
    // }
    User.find({secret:{$ne:null}},(err,obj)=>{
        if(err) console.log(err);
        else{
            if(obj){
                res.render('secrets.pug',{userWithSecrets:obj});
            }
        }
    })
})

app.get('/submit',(req,res)=>{
    if(req.isAuthenticated()){
        res.render('submit.pug');
    }
    else{
        res.redirect('/login');
    }
})

app.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
})
app.post('/register',(req,res)=>{
    // bcrypt.hash(req.body.password, saltRounds, (err, hash)=> {
    //     // Store hash in your password DB.
    //     const userName=req.body.username;
    //     // const passcode=hash
    //     // console.log(userName+password);
    //     const user=new User({
    //         email:userName,
    //         password:hash
    //     })
    //     user.save((err)=>{ 
    //         if(err) res.send(err);
    //         else res.render('secrets.pug');
    //     });
    // });

    User.register({username: req.body.username},req.body.password,(err,user)=>{
        if(err){
            console.log(err);
            res.redirect('/register');
        }
        else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets');
            })
        }
    })
    
});

app.post('/login',(req,res)=>{
    // res.send('Login Successfully');
    // const userName=req.body.username;
    // const passcode=req.body.password;
    // User.findOne({email:userName},(err,obj)=>{
    //     if(!err){
    //         if(obj){
    //             bcrypt.compare(passcode,obj.password, function(err, result){
    //                 if(result===true)  res.render('secrets.pug');
    //                 else res.send("Wrong credentials!! Email and password don't match");
    //             });
    //         }
    //     }
    // })


    const user=new User({
        username:req.body.username,
        password:req.body.password
    })

    req.login(user,(err)=>{
        if(err) console.log(err);
        else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets');
            })
        }
    })

})

app.post('/submit',(req,res)=>{
    const submittedSecret=req.body.secret;
    // console.log(req.user);
    User.findById(req.user.id,(err,obj)=>{
        if(err) console.log(err);
        if(obj){
            obj.secret=submittedSecret;
            obj.save(()=>{
                res.redirect('/secrets');
            })
        }
    })
})

app.listen(3000,()=>{
    console.log('Successfully starting at 3000');
})

