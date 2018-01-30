var config = require('config.json')('./as_config.json');

var Client = require('../../models/client');
var Random = require('../../common/random');

var express = require('express');
var router = express.Router();
var authController = require('../../controllers/auth');

/**
 * Implementation follows IETF RFC 7591 Dynamic Client Registration
 * and, to a certain extent, the experimental IETF RFC 7592 Dynamic Client Registration Management
 * In the RFC 7592, a token is assigned to call the registration management endpoint.
 * We use client_secret to authenticate the client.
 */


/**
 * /oauth/dyn_client_reg POST
 * Dynamic client registration following IETF RFC 7591
 * The response in case of error also defined by RFC as a JSON object
 * error:             REQUIRED, code string defined by RFC
 * error_description: OPTIONAL, human readable text description
 * Returns:
 * 201  JSON object: registration data and generated
 *                   client_id
 *                   client_secret
 *                   client_id_issued_at
 *                   client_secret_expires_at
 *
 * 400 {error: "invalid_client_metadata"}
 * 500 {error: "server_error"}
 */

router.post('/', function(req, res) {

    console.log(req.body);

    //If client_name or uri is missing, reject the registration
    //Clients are RECOMMENDED to provide these values according to RFC 7591
    if(!req.body.hasOwnProperty('client_name') ||
       !req.body.hasOwnProperty('client_uri')) {
        res.statusCode = 400;
        res.json({"error": "invalid_client_metadata"});

    } else {

        var client = new Client(req.body);

        //generate client_id
        //generate client_secret
        client.client_id = Random.uid(16);
        var client_secret = Random.getRandomBytes64(32);
        client.client_secret_hash = Random.digest256(client_secret);


        console.log("AS: Dynamic client registration - client generated:",client);


        client.save()
            .then(function (){
                //SUCCESS: client information response
                //HTTP 201 created
                //We return the received client data, and add the info created by AS for this client registration.
                var res_data = req.body;
                res_data["client_id"] = client.client_id;
                res_data["client_secret"] = client_secret;
                res_data["client_id_issued_at"] = client.client_id_issued_at;
                res_data["client_secret_expires_at"] = client.client_secret_expires_at;

                res.statusCode = 201;
                res.setHeader("Cache-Control","no-store");
                res.setHeader("Pragma","no-cache");

                res.json(res_data);

            })
            .catch(function (err){
                res.statusCode = 500;
                var error_message =  "server_error";

                console.log(err);
                //This is mongo specific
                if(err.code == "11000"){
                    error_message = "Client already registered"
                }
                res.json({"error":error_message});
            });

    }
});


/**
 * GET client registration
 *
 * Response:
 * 200 Client registration information
 *
 * 404 {error: "not found"}
 * 500 {error: "server error"}
 *
 **/
router.get('/', authController.isClientAuthenticated, function(req,res) {

   //The client authentication passed, so the client information is passed from Passport to req
    //as req.user

    if(req.user){
        res.statusCode = 200;
        res.json(req.user);
    } else {
        res.statusCode = 500;
        res.json({"error": "server_error"});
    }

});

/**
 * PUT client registration
 *
 * Response:
 * 200 Client registration information
 *
 * 401 {error: "not authorized"}
 * 400 {error: "invalid_client_metadata"}
 * 500 {error: "server_error - input may be incorrect"}
 */


router.put('/', authController.isClientAuthenticated, function(req,res){

    var client  = req.user;
    var new_client_data = req.body;


    //Keep old client_id and client_secret - implemented differently than IETF 7592
    //ToDo: Think about refreshing client_secret
    new_client_data.client_id = client.client_id;
    new_client_data.client_secret_hash = client.client_secret_hash;


    if( !new_client_data.hasOwnProperty('client_name') ||
        !new_client_data.hasOwnProperty('client_uri') ||
        new_client_data.hasOwnProperty('client_secret_expires_at') ||
        new_client_data.hasOwnProperty('client_id_issued_at')) {
        res.statusCode = 400;
        res.json({"error": "invalid_client_metadata"});
    } else {

        Client.findOneAndUpdate({"client_name": client.client_name}, new_client_data, {upsert: false, new: true})
            .exec()
            .then(function (client) {
                    //Mute the client secret hash
                    client.client_secret_hash = undefined;
                    client.__v = undefined;
                    res.statusCode = 200;
                    res.json(client);
            })
            .catch(function () {
                res.statusCode = 500;
                res.json({error:"server_error - input may be incorrect"});
            });
    }

});


module.exports = router;



