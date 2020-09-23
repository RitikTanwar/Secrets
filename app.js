require('dotenv').config();
const express=require('express');
const bodyParser=require('body-parser');
const path=require('path');
// const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const encrypt=require('mongoose-encryption');

const app=express();


mongoose.connect('mongodb://localhost/userDB',{useNewUrlParser:true,useUnifiedTopology:true});

mongoose.connection;

const userSchema=mongoose.Schema({
    email:String,
    password:String
})

userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields: ['password']});

const User=new mongoose.model('User',userSchema);

app.use(bodyParser.urlencoded({extended:true}));
app.use('/static',express.static('static'));

app.set('view engine','pug');
app.set('views',path.join(__dirname,'template'));

app.get('/',(req,res)=>{
    const params={};
    res.render('home.pug',params);
})

app.get('/register',(req,res)=>{
    res.render('register.pug');
})
app.get('/login',(req,res)=>{
    res.render('login.pug');
})

app.post('/register',(req,res)=>{
    const userName=req.body.username;
    const passcode=req.body.password;
    // console.log(userName+password);
    const user=new User({
        email:userName,
        password:passcode
    })
    user.save((err)=>{
        if(err) res.send(err);
        else res.render('secrets.pug');
    });
    
});

app.post('/login',(req,res)=>{
    // res.send('Login Successfully');
    const userName=req.body.username;
    const passcode=req.body.password;
    User.findOne({email:userName},(err,obj)=>{
        if(!err){
            if(obj){
                if(obj.password===passcode) {
                    res.render('secrets.pug');
                }
                else res.send("Wrong credentials!! Email and password don't match");
            }
        }
    })
})

app.listen(3000,()=>{
    console.log('Successfully starting at 3000');
})