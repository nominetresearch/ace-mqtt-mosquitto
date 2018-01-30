//Passport strategies to support different types of authentication mechanisms
var config = require('config.json')('./as_config.json');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;

var User = require('../models/user');
var Client = require('../models/client');

var Random = require('../common/random');


/**
 * From Passport documentation: http://passportjs.org/docs
 * Each subsequent request will not contain credentials, but
 * rather the unique cookie that identifies the session.
 * Passport serializes and deserializes user instances to and from session
 *
 *
 * In serializeUser: Only the username is serialized to the session.
 * When subsequent requests are received, this username is used to find the user,
 * and stored in req.user
 *
 */

passport.serializeUser(function(user, done) {
	done(null, user.username);
});

passport.deserializeUser(function(username, done) {
	User.findOne({username:username}, function(err,user){
		done(err, user);
	});
});


/**
 * Passport local strategy, provided by passport-local module
 *
 * Name of the strategy: user-basic
 * Uses the following checks:
 *   -- Checks whether the user exists
 *   -- Checks if password is a match
 */
passport.use('user-basic',new LocalStrategy (
	function(username,password,callback){
		User.findOne({username:username}, function(err,user){
			if(err) {
				return callback(err);
			}

			if(!user){
				console.log("AS user-basic strategy: User does not exist.");
				return callback(null,false);
			}

			if(!user.validPassword(password)){
				console.log("AS user-basic strategy: Incorrect password.");
				return callback(null,false);
			}

			return callback(null,user);
		});
	})
);


/**
 * Passport basic strategy
 * From Passport documentation: http://passportjs.org/docs
 * Implements RFC 2617
 *
 * Name of the strategy: client-basic
 * Implements Basic HTTP authentication with client_id and client_secret
 * (client_id and client_secret are assigned during (dynamic)
 * client registration.
 * Does not create a session.
 */

passport.use('client-basic', new BasicStrategy(
	function(clientId,clientSecret,callback){

		console.log("Checking client");

		Client.findOne({client_id:clientId}, {_id:0},function(err,client){

				if(err) {return callback(err);}

			var clientHash = Random.digest(clientSecret,'sha256');


			//Check the client exists, and has the correct secret
			if(!client || client.client_secret_hash !== clientHash || Date.now() > client.client_secret_expires_at) {
					console.log("AS client-basic strategy: Incorrect client information");
					return callback(null, false);

			}

			console.log("Found client");

			return callback(null,client);
		});			
	}
));


exports.isUserAuthenticated = passport.authenticate('user-basic');
exports.isClientAuthenticated = passport.authenticate('client-basic', {session:false});
