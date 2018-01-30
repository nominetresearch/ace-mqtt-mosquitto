/**
 * Implements user API
 * @type {*|exports|module.exports}
 */

var config = require('config.json')('./as_config.json');

var User = require('../../models/user');

var Tokens = require('../../models/tokens');
var AccessToken = Tokens.AccessToken;
var Policies = require('../../models/policy');

var express = require('express');
var router = express.Router();
var authController = require('../../controllers/auth');


/** Resource owner functions:
 *   register          - POST
 *   login             - POST
 *   logout            - GET
 *   policy            - POST
 *   policy/id         - GET, PUT, DELETE
 *   clients_sharing   - GET
 */

/**
 * Checks authentication
 * @param req
 * @param res
 * @param next
 */
var auth = function(req, res, next){
    if (!req.isAuthenticated())
        res.sendStatus(401);
    else
        next();
};

/**
 * api/ro/register POST
 *
 * save the new user
 * returns:
 * 200 success : "registration_success."
 * 400 error   : "username_already_exists."
 * 500 error   : "server_error."
 */

router.post('/register', function(req,res){

    var name = req.body.username;


    User.findOne({username:name})
        .then(
            function(user){
                if(user) {
                    res.statusCode = 400;
                    res.json({"error": "username_already_exists."});
                } else {
                    var new_user = new User();
                    new_user.username = name;
                    new_user.setPassword(req.body.password);

                    new_user.save()
                        .then(function(){
                                res.statusCode = 200;
                                res.json({"success":"registration_success."});
                        });
                }
            })
        .catch(function(){
            res.statusCode = 500;
            res.json({"error":"server_error."});
        });

});

/**
 * /api/ro/login POST
 *
 * Checks if user is authenticated.
 */

router.post('/login', authController.isUserAuthenticated, function(req,res){

    res.statusCode=200;
    res.json({"success":"login_success."})

});

/**
 * /api/ro/logout GET
 *
 * Logs the user out
 */

router.get('/logout',function(req,res){

    req.logout();

    res.statusCode=200;
    res.json({"success":"logged_out"});

});



/**
 * /api/ro/list_policies
 *
 * List the policies for the owner_name
 * returns:
 * 200 Policies or []
 * 500 {result:"error", message:"Server error.}
 *
 */

router.get('/list_policies', auth, function(req,res){

    var owner = req.user.username;

    Policies.find({"owner_name":owner})
        .exec()
        .then(function(policies){

            res.statusCode = 200;

            if(!policies || !policies.length){
                res.send([]);
            } else {
                res.send(policies);
            }
        })
        .catch(function(){
            res.statusCode = 500;
            res.json({error:"Server error."})
        });

});


/**
 * api/as/policy POST
 *
 * UPSERT a policy
 */


router.post('/policy', auth, function(req,res){

    var new_policy = req.body;
    new_policy.owner_name = req.user.username;

    Policies.findOneAndUpdate({owner_name: new_policy.owner_name,
                                           resource_name: new_policy.resource_name,
                                           client_id: new_policy.client_id},
                                            new_policy,
                                            {upsert:true, new:true})
        .exec()
        .then(function (result){
            if(!result){
                res.statusCode = 500;
                res.json({"error": "Database error"});
            } else {
                res.statusCode = 200;
                res.json({"success": "Policy updated."});
            }
        })
        .catch(function (){
            res.statusCode = 500;
            res.json({"error": "Error"});
        });

});

/**
 * /api/ro/policy/id GET
 *
 * Get  a policy by id
 *
 * Returns:
 * 200 JSON object: policy
 * 401 Not authenticated
 * 404 {error: "not_found"}
 * 500 {error:"server_error"}
 *
 */

router.get('/policy/:id', auth, function(req,res){

    var id = req.params.id;
    var user  = req.user.username;

    Policies.findOne({"_id":id, "owner_name":user})
        .exec()
        .then(function(policy) {
            if(!policy){
                res.statusCode = 404;
                res.json({error: "not_found"});
            } else {
                res.statusCode = 200;
                res.json(policy);
            }
        })
        .catch(function (){
            res.statusCode = 500;
            res.json({error: "server_error - input may be incorrect"});

        });
});


/**
 * /api/ro/policy/id PUT
 * This is a complete replacement of the previous policy description.
 * So, the create rules apply.
 *
 * Update a policy by id - the logged in user needs to be the owner of the policy
 * Returns:
 * 200 {_id: <id>}
 * 400 {error:"invalid_resource_metadata"}
 * 401 Not authenticated
 * 404 {error: "not_found"}
 * 500 {error:"server_error"}
 */

router.put('/policy/:id', auth, function(req,res){

    var user  = req.user.username;
    var policy_data = req.body;
    policy_data.owner_name = user;
    var id = req.params.id;

    console.log(policy_data);

    if(!policy_data.hasOwnProperty('scopes')) {
        res.statusCode = 400;
        res.json({error: "invalid_resource_metadata"});
    } else {
        Policies.findOneAndUpdate({"_id": id, "owner_name": user}, policy_data, {upsert: false, new: true})
            .exec()
            .then(function (policy) {
                if (!policy) {
                    res.statusCode = 404;
                    res.json({error: "not_found"});
                } else {
                    res.statusCode = 200;
                    res.json({_id: policy._id});
                }
            })
            .catch(function (err) {
                console.log(err);
                res.statusCode = 500;
                res.json({error:"server_error - input may be incorrect"});
            });
    }
});



/**
 * api/ro/policy/:id DELETE
 * Delete policy.
 *
 * Returns:
 * 204 {success:"deleted"}
 * 404 {error: "not_found"}
 * 500 {error:"server_error"}
 */

router.delete('/policy/:id', auth, function(req,res){

    var id = req.params.id;
    var user  = req.user.username;


    Policies.findOneAndRemove({"_id":id, "owner_name":user}, {"new":false})
        .then(function (doc){
            if(!doc){
                //Delete failed as new: brings document after updates
                res.statusCode = 404;
                res.json({"error":"not_found"});

            } else {
                res.statusCode = 204;
                res.send();
            }
        })
        .catch(function (){
            res.statusCode = 500;
            res.json({"error": "server_error"});
        });

});


/**
 * /api/ro/list_active_tokens
 *
 * Listing active tokens (and the resources they are for) for the owner_name
 *
 * returns:
 * 200 An array of JSON objects {client_name:<>, resource_id:<>} or []
 * 500 {result:error, message:"Server error"}
 *
 */


router.get('/clients_sharing', auth, function(req,res){

    var user = req.user.username;

    AccessToken.find({"owner_name":user})
        .then(function(tokens){
            if(!tokens || !tokens.length){

                res.send([]);

            } else {

                var list_of_active_clients_per_resource = [];
                for (var i=0; i< tokens.length;i++){
                    list_of_active_clients_per_resource[i]={client_name:tokens[i].sub,
                        aud : tokens[i].aud};

                }

                res.send(list_of_active_clients_per_resource);
            }
            })
        .catch(function(){
            res.statusCode = 500;
            res.json({"error":"Server error."});
        });
    
});


module.exports = router;
