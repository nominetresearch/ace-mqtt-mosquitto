/**
 * Express app config
 * ToDo: 1. Better logging
 * ToDo:   cookie: {secure:true}
 * ToDo: 3. Session store?
 * ToDo: 4. Local database - support access control
 */

/******* Include **************/

var config = require('config.json')('./as_config.json');

var express = require('express');
var path = require('path');



var logger = require('morgan');

var bodyParser = require('body-parser');

//Route files
var dyn_client = require('./routes/oauth/dynamic_client');
var ro = require('./routes/ro/ro');
var introspection = require('./routes/rs/introspection');

//Promise middleware
var Promise = require('bluebird');

//Mongo db middleware
var mongoose = Promise.promisifyAll(require("mongoose"));

//Authentication middleware and controllers
var passport = require('passport');
var oauth2Controller = require('./controllers/oauth2');

//Session middleware
var session = require('express-session');
var cookieParser = require('cookie-parser');


/*********** App initialization/configuration **********************/

var app = express();

// Session parameters
// resave: forces the session to be saved back to the session store.
// saveUninitialized: forces an unitialized session to be saved to the store.
// secret: to sign the session cookie

app.use(cookieParser());


//When we move to HTTPS only, add secure:true attribute for cookie
app.use(session({
  secret: config.security.sessionSecret,
  saveUninitialized: true,    //save new sessions
  resave: false,  //do not automatically write to the session store
  cookie: {httpOnly:true, maxAge:24192000000}
}));

//initialize passport
// Express and passport use the same session, Passport piggybacks on req.session
app.use(passport.initialize());
app.use(passport.session());


// uncomment after placing favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//Only log in 'dev'
app.use(logger('dev'));

//Returns middleware that only parses json
app.use(bodyParser.json());

//Returns middleware that only parses urlencoded bodies
//When extended false, the URL-encoded data is parsed using querystring library
app.use(bodyParser.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(config.mongoose.uri, {useMongoClient:true, promiseLibrary:require('bluebird')});

/***************** Routes *************************************/


//Routes for resource owner
app.use('/api/ro',ro);

//Routes for client
app.route('/api/client/token')
    .post(
        function(req,res,next){
          //MUST specify content type: We accept application/json
          // Others can be defined, e.g., aplication/cbor
          var content_type = req.headers['content-type'];
          if(!content_type || content_type.indexOf('application/json') !== 0) {
            res.send(400);
          }
          next();
        }
        , oauth2Controller.token);

app.use('/api/client/dyn_client_reg',dyn_client);

//Routes for resource server
app.use('/api/rs/introspect',introspection);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/***************** Error handling in different environments*********************/

//export NODE_ENV=production sets the environment to production

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err
    });
  });
}



// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: "Server error",
    error: {}
  });
});



module.exports = app;
