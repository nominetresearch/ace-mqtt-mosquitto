/**
 * Created by cigdem on 27/04/2016.
 */
/**
 * Tokens are left as quite flexible data structures in standards documentation.
 * Implements access token based on recommendations in RFC 6749 and 6750.
 * Optional JSON Web Token
 *
 */

var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

/**
 * Access Token
 */
var AccessTokenSchema = new mongoose.Schema({
    profile:             {type:String, required:true, default:'mqtt_tls'},
    token_value_hash:    {type:String, unique:true, required:true},
    token_type:          {type:String, default:'pop'},
    iss:                 {type:String,default:'asID'},
    sub:                 {type:String, required:true},
    aud:                 {type:String,required:true},
    scope:              {type:Array,required:true},
    exp:                 {type:Date,required:true},
    cnf:                 {
                            jwk: {
                                kty: {type:String, required:true},
                                alg: {type:String, required:true, default:'HS256'},
                                k:   {type:String, required:true}
                            }

                         }
});


/**
 * Exports AccessToken
 */


var AccessTokenModel = mongoose.model('AccessToken', AccessTokenSchema);

module.exports.AccessToken = AccessTokenModel;

