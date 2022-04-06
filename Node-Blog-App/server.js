const express = require('express');
const session = require('express-session');
const MemoryStore =session.MemoryStore;
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); //allows use of form information
const app = express();

app.use(express.static(__dirname + '/public'));

/*MIDDLEWARE*/
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.set('view engine', 'ejs');

/*DATABASE*/
//mongoose.connect("mongodb://nodeapp:Noodles@localhost:27017/rileysdb");

/*adding variables*/
const connectionSting = `mongodb://${process.env.DB_HOST}/rileysdb`
//const connectionSting = `mongodb://${process.env.USER_NAME}:${process.env.PASSWORD}@${process.env.DB_HOST}`
console.log(connectionSting)

mongoose.connect (
  connectionSting
)

//see environment in node-app docker-compose

app.use(session({
  secret: 'secret',
  name: 'uniqueID',
  resave: true,
  store: new MemoryStore(),
  saveUnitialized: false
}))

/*SCHEMAS*/
//child scheme for post data
let childSchema = new mongoose.Schema({
              title: String,
              content: String,
              tag: String,
              status: String // either draft or published  
          });

//user object
let postSchema = new mongoose.Schema({
    username: {type: String, required: true, lowercase: true, maxLength: 100},
    password: String,
    posts: [ childSchema ]
  })


const User = mongoose.model("User", postSchema, 'Users')// the collection is renamed as posts


//route
app.get("/",(req,res)=>{
  
  User.find({}, (err,result)=>{ //'post' can be anything....aka 'data'
    console.log(result)
  
    res.render('../index.ejs', {
    result:result
  
  })
  })
})


//login form page
app.get('/login', function(req,res){
  res.sendFile('login.html', {root: __dirname})

})


// kill the session
app.get('/logout',function(req,res){
  req.session.destroy();
  res.redirect('/');
})

//register form page
app.get('/register', function(req,res){
  res.sendFile('register.html', {root: __dirname})

})


//User posts page
app.get('/userposts', function(req,res){
  if (req.session.loggedIn) {
    res.render('../userposts.ejs');
    
  } else {res.redirect('/login')}
})


//User posts page
app.get('/update-posts', function(req,res){
  if (req.session.loggedIn) {
    res.render('../update-post.ejs');
    
  } else {res.redirect('/login')}
})


//AUTH
app.post('/login', function(req,res){
  
  User.find({username: req.body.username}, function(err,result){
      console.log(result)
    
     let data = result
     console.log(data)
  
       if(data) {
         //starts session related to new user
          let newuser = data[0].username;
          req.session.username = newuser;
          req.session.loggedIn = true;
         
       //return res.json(newuser);
       res.render('../userposts.ejs', {
         result:result
       })

        } else {
          console.log("sorry, wrong password. Try again");
          res.render('../error.ejs')
        }
  })
 })

  
//AUTH
app.post('/register', function(req,res){
  
   let username= req.body.username;
      //console.log(username);
    let password= req.body.password;
      //console.log(password);

      //create javascript object
      let myData = {
              username: username,
              password: password
              //posts: childSchema
              }
      
 let userData = new User(myData) //will come from a form as JSON 
 
  userData.save().then(result =>{   
    //return res.json(result);
   console.log(result);
   res.redirect('/login')
  }) 
})


//CREATE
app.post('/addpost', (req,res)=>{
  
  //console.log(req.session.username)
  //console.log(req.sessionID)
  //console.log()
  
  //if (req.session.loggedIn) {
  
  //req.session.username
   //User.find({username: req.session.username }, function(req,res){
  
  let newuser = req.session.username;  
  
   let title= req.body.title;
    let content= req.body.content;
    let tag= req.body.post_tag;
    let status= req.body.post_status;

  let query = {username:newuser};
  
  let postData = {$addToSet:
                    {posts:{
                    title: title, 
                    content: content,
                    tag: tag,
                    status: status
                    }
                  }}
     
      
      User.updateOne(query, postData, function(err, result){
        if (err) {throw err} else {
          
        console.log(result)
        
       res.redirect('/getposts') 
                      
  }    
 })
})              
                    
//READ 
app.get('/getposts', (req,res)=>{
  
 //console.log(req.session.username)
  
// User.find({username: req.session.username }, function(req,res){
  
  User.find({username: req.session.username}, (err,result)=>{ //'result' can be anything....aka 'data'
    //console.log(result);
    
   res.render('../userposts.ejs', {
     result:result //this will send to the template
   }) 
  })
})

 


//READ SINGLE
app.post('/singlePost', (req,res)=>{
   
 var ObjectId = require('mongodb').ObjectId;

let postID = req.body.postID;

//db.getCollection('Users').find({"posts._id": ObjectId("6220d76d7c175cb529a01b2d")}, {posts: {$elemMatch: {"_id": ObjectId("6220d76d7c175cb529a01b2d")}}})

  User.find({"posts._id" : ObjectId(postID)}, {"posts": {$elemMatch: {"_id": ObjectId(postID)}}}, (err,result)=>{ //'result' can be anything....aka 'data'

 
   console.log(result);
  
   res.render('../singlepost.ejs', {
     result:result //this will send to the template

   }) 
  })
  
 })

//UPDATE
app.post('/update', (req,res)=>{
 
 //TITLE
  let currentTitle= req.body.currentTitle;
  let newTitle= req.body.newTitle;
 // let query = {"posts.title" : currentTitle}
  
  //CONTENT
  let currentContent= req.body.currentContent;
  let newContent= req.body.newContent;
 // let query = {"posts.title" : currentTitle, "posts.content" : currentContent};
  
  //STATUS
  let currentStatus= req.body.currentStatus;
  let newStatus= req.body.newStatus;
  let query = {"posts.title" : currentTitle, "posts.content" : currentContent, "posts.status" : newStatus};
  
 
  //db.getCollection('Users').updateOne({ "posts.title" : "second title"},{$set : {"posts.$.title" : "third title"}})
  //let variable1 = "posts.0.title";
  let variable1 = "posts.$.title";
  let variable2 = newTitle;   //updated title
  let variable3 = "posts.$.content";
  let variable4 = newContent; //updated content
  let variable5 = "posts.$.status"
  let variable6 = newStatus;
  
  //let whatismydatatoupdate = {}
  let object = {
    [variable1] :variable2,
    [variable3] :variable4,
    [variable5] :variable6
  }

   User.updateOne(query, {$set : object}, function(err,result) {
    if (err) {
     //console.log(result)
     res.send(err);

    } else {
      console.log(result)
      
      res.redirect('/') 
    }
  })
})
 

app.listen(3000, () => {
  console.log('server is running');
})
