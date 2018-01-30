/**
 * Client schema as defined by RFC 7591
 */

//According to RFC, the client_secret_expires_at is
//the number of seconds from 1970-01-01T00:00:00Z

var config = require('config.json')('./as_config.json');

var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var dateMath = require('date-arithmetic');

var issued_at = Date.now();
var expires_at = dateMath.add(issued_at, config.security.clientSecretLife, 'month');

var token_endpoint_auth_method = "client_secret_basic";
var grant_types = ["client_credentials"];
var response_types = ["token"];
//ACE specific information
var profiles_supported = ["mqtt_tls"];

var ClientSchema = new mongoose.Schema({
    client_name:                {type:String, unique:true, required: true},
    client_uri:                 {type:String, unique:true, required:false},
    logo_uri:                   {type:String, required:false},
    //Scope is a string containing a space-separated list of scope values
    scope :                     {type:String, required:false},
    contacts:                   {type:String, required:false},
    tos_uri:                    {type:String, required:false},
    policy_uri:                 {type:String, sparse:true},
    jwks:                       {type:Object, required:false},
    jwks_uri:                   {type:String, sparse:true},
    software_id:                {type:String, sparse:true},
    software_version:           {type:String, required: false},
    client_id:                  {type:String, unique:true,required: true},
    client_secret_hash:         {type:String, unique:true, required:false},
    client_id_issued_at:        {type:Date, default:issued_at},
    client_secret_expires_at:   {type:Date, default:expires_at},
    token_endpoint_auth_method: {type:String, default:token_endpoint_auth_method},
    grant_types:                {type:Array, default:grant_types},
    response_types:             {type:Array,default:response_types},
    //ACE specific information
    profile:                    {type:Array, default:profiles_supported, required:false},
    aud:                        {type:String,required:false}
});

module.exports = mongoose.model('Client', ClientSchema);