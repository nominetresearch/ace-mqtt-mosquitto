/**
 * Created by cigdem on 16/05/2016.
 */

/**
 * Simple policy
 * @type {*|exports|module.exports}
 * Allows a special client id "any" to write policies that apply to any client
 */

var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var SimplePolicySchema = new mongoose.Schema({
    resource_name: {type: String, required: false},
    owner_name: {type: String, required:true},
    client_id: {type: String, required: false},
    scopes: {type: Array, required: true},
    policy_expires_at: {type:Date, required:false}
});

SimplePolicySchema.index({owner_name:1, resource_name:1, client_id:1},{unique:true, sparse:true});


module.exports = mongoose.model('Policy', SimplePolicySchema);