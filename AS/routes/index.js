var express = require('express');
var router = express.Router();

//Server routes are in different files under routes folder
//Explained in app.js

/**
 * GET home page - placeholder
 */

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Nominet MQTT ACE Authorization Server' });
});

module.exports = router;
