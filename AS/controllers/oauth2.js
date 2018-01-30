//Handles OAuth2.0 flow using oauth2orize and passport

var config = require('config.json')('./as_config.json');

var oauth2orize = require('oauth2orize');
var authController = require('./auth');

var Tokens = require('../models/tokens');
var AccessToken = Tokens.AccessToken;
var Policies = require('../models/policy');

var Random = require('../common/random');

/**
 * Create a new Oauth2.0 server
 * @type {*|Server}
 */

var server = oauth2orize.createServer();


/**
 * Implements OAuth2 client credentials flow
 * Client credentials is exchanged with token
 * It is assumed that the token type is "pop"
 * and symmetric key cryptography is used
 *
 * RFC 6749:
 * The authorization server MUST do the following checks:
 * Check whether aud parameter exists in the request
 * or whether a default value is set by the client during dynamic registration
 *
 * //ToDo: Handle subset of scopes
 * //ToDo: Extend to support additionally asymmetric keys
 * //ToDo: Extend to other algorithms for cnf - default HS256
 * //ToDo: Supports single token per client. Extend to multiple tokens per client?
 * //ToDo: Supports token by reference, support RS-encrypted JWT token
 */

server.exchange(oauth2orize.exchange.clientCredentials(function(client,scope,body,done){

        // Check whether aud parameter exists in the request
        // or whether a default value is set by the client during dynamic registration
        if(!(body.aud || client.aud) ||
            (body.aud && client.aud && body.aud!=client.aud)){
            var error = {
                status: 400,
                message: "invalid_request"
            };
            return done(error);
        }

        //We take the aud as the resource_name, which is the topic name
        var audience;
        if (body.aud){
            audience = body.aud;
        } else{
            audience = client.aud;
        }


        Policies.findOne({client_id: client.client_id,resource_name:audience},function (err, policy) {
            if (err){
                done(err);
            } else {
                var error = {
                    status: 400,
                    message: "unauthorized_client"
                };
                if (!policy) {
                    return done(error);
                } else {

                    //check if policy is valid
                    if(policy.policy_expires_at && (policy.policy_expires_at < Date.now())){
                        console.log("policy expired");
                        return done(error);
                    }

                    //This is looking for exact match to requested scopes
                    //Does not implement partial scopes
                    //ToDo: Handle subset of scopes
                    for(var i=0; i<scope.length; i++){
                        if(policy.scopes.indexOf(scope[i])==-1){
                            console.log("Scopes do not match");
                            return done(error);
                        }
                    }

                    var token_value = Random.getRandomBytes_base32(256);
                    var token_value_hash = Random.digest(token_value,'sha256');

                    var key = Random.getRandomBytes_base64(128);

                    //Generate the access token
                    //Symmetric key with HS256
                    //ToDo: Extend to the other algorithms
                    var access_token = {
                        token_value_hash: token_value_hash,
                        sub: client.client_id,
                        aud: audience,
                        exp: Date.now() + config.security.tokenLife,
                        scope: scope,
                        cnf: {
                            jwk: {
                                kty: "oct",
                                alg: "HS256",
                                k:   key
                            }
                        }
                    };


                    console.log(access_token);

                    //Upsert the access token - keeps a single token for each client
                    //Send the number of seconds from 1970
                    //ToDO: Multiple tokens per client?
                    AccessToken.findOneAndUpdate({sub: access_token.sub}, access_token, {upsert: true},
                        function (err) {
                            if (err) {
                                return done(err);
                            } else {
                                //CLient info
                                var params = {
                                    profile: "mqtt_tls",
                                    token_type: "pop",
                                    exp: access_token.exp,
                                    cnf: {
                                        jwk: {
                                            kty: "oct",
                                            alg: "HS512",
                                            k:   key
                                        }
                                    }
                                };

                                //We are passing the token by reference
                                //ToDo: Support RS-encrypted JWT token?
                                return done(null, token_value, null, params);
                            }
                        });
                }
            }
        });
}));



/**
 * Oauth2orize token endpoint
 * @type {*[]}
 */

exports.token = [
	authController.isClientAuthenticated,
	server.token(),
	server.errorHandler()
];
