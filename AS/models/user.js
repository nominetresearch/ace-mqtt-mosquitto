/**
 * Implements a user model
 * @type {*|exports|module.exports}
 */


var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const crypto = require('crypto');


var UserSchema = new mongoose.Schema({
    username: {type:String, unique:true, required:true},
    hash: {type:String, required:true},
    salt: {type:String, required:true}
});


/**
 * Creates a hash of the password, based on a random salt.
 * @param password
 */
UserSchema.methods.setPassword = function(password){
    console.log("User Schema: Setting password");
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password,this.salt, 100000,512,'sha512').toString('hex');
};

/**
 * Returns true if the password generates the stored hash, using the stored salt.
 * @param password
 * @returns {boolean}
 */


UserSchema.methods.validPassword = function(password){
    console.log("User Schema: Verifying password");
    var hash = crypto.pbkdf2Sync(password,this.salt,100000,512,'sha512').toString('hex');
    return this.hash == hash;
};

module.exports = mongoose.model('User', UserSchema);
