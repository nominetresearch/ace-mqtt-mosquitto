/**
 * Created by cigdem on 31/05/2016.
 */

var express = require('express');
var router = express.Router();

var authController = require('../../controllers/auth');
var Tokens = require('../../models/tokens');
var AccessToken= Tokens.AccessToken;

var Random = require('../../common/random');

/**
 *
 * /ace/rs/introspection POST
 *
 * OAuth2-based token introspection
 *
 * Introspection request includes the token (REQUIRED), and
 * omits token_type_hint (OPTIONAL).
 *
 * AS required by the RFC, this introspection endpoint MUST require
 * some form of authorization.
 *
 * Introspection response
 * If the token is active, the response must include an active field
 * set to true and may include a set of other information:
 *
 * active (REQUIRED) - included
 * scopes (OPTIONAL)  - included
 *
 * If the token is not active, the response must include an active field set to false.
 * If the token does not exist, the response also includes an active field set to false.
 *
 * If the authentication is not valid, the AS Responds with HTTP 401.
 *
 * In both cases, where the introspected token expired, the token is deleted.
 * This provides lazy deletion of tokens.
 *
 * ToDo: Client Tokens
 *
 */

router.post('/', authController.isClientAuthenticated, function(req,res){

    var token = req.body.token;

    //Since the client is authenticated, the response 200 status code,
    //but if the token is invalid or does not exist, then the token_response
    //active field is set to false
    res.statusCode = 200;

    var token_response;

    //Assume "active" false unless proven otherwise
    token_response = {
        "active": false
    };

    var token_value_hash = Random.digest(token,'sha256');

    console.log(token_value_hash);

    AccessToken.findOne({"token_value_hash":token_value_hash}).exec().then(function successCallback(token) {

        if (token) {

            //Check if the token has expired
            if (token.exp < Date.now()) {

                //Token has expired
                token.remove(function (err) {
                    if (err) {

                        console.log("AS: token introspection - error:", err);

                    } else {

                        console.log("AS: token introspection - deleted expired token.");
                    }
                })

            } else {
                //Token is valid - modify token response to active:true

              //Send expiration seconds after 1970

                token_response = {
                    "active": true,
                    "profile": token.profile,
                    "exp": Date.parse(token.exp)/1000,
                    "sub": token.sub,
                    "aud": token.aud,
                    "scope": token.scope,
                    "cnf": token.cnf
                };
            }
        }

        res.json(token_response);

    }, function errorCallback(err){
        console.log("AS: token introspection - error:", err);
        res.json(token_response);
    });

});

module.exports = router;