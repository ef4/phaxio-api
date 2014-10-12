var request = require('request');
var multer = require('multer');
var express = require('express');
var url = require('url');
var EventEmitter = require('events').EventEmitter;

require('es6-promise').polyfill();

function PhaxioAPI(config){
  if (!(this instanceof PhaxioAPI)) {
    return new PhaxioAPI(config);
  }
  EventEmitter.call(this);

  this.url = config.url || 'https://api.phaxio.com/v1';
  if (!config.api_key) {
    throw new Error("Must configure api_key");
  }
  this.api_key = config.api_key;
  if (!config.api_secret) {
    throw new Error("Must configure api_secret");
  }
  this.api_secret = config.api_secret;
  if (config.callback_url) {
    this.callback_url = url.parse(config.callback_url);
    if (!this.callback_url.host) {
      throw new Error("callback_url must be absolute");
    }
  }
}

PhaxioAPI.prototype = Object.create(EventEmitter.prototype);

/*
   Stream a document:

   phaxio.send('1235551212', {stream: fs.createReadStream(myFileName)})

   Stream a document with optional filename and contentType:

   phaxio.send('1235551212', {
     stream: anyReadableStream,
     contentType: 'application/pdf',
     filename: 'foo.pdf'
   });

   Send a string via phaxio's string_data options:

   phaxio.send('1235551212', {
     string_data: 'http://example.com/some_document',
     string_data_type: 'url'
   });

   All other opts get passed through to phaxio's sendFax unchanged:

   http://www.phaxio.com/docs/api/send/sendFax/

   Returns a Promise for the parsed JSON response.
*/
PhaxioAPI.prototype.send = function(phoneNumber, opts) {
  var args = splitOptions(opts);
  return postForm(this.url + '/send', this, function(form) {
    form.append('to', String(phoneNumber));
    form.append('api_key', this.api_key);
    form.append('api_secret', this.api_secret);
    if (this.callback_url) {
      form.append('callback_url', this.callback_url.href);
    }
    for (var key in args.phaxio) {
      if (key === 'stream') {
        form.append('filename', args.phaxio[key], args.filename);
      } else {
        form.append(key, args.phaxio[key]);
      }
    }
  });
};

PhaxioAPI.prototype.faxStatus = function(id) {
  return postForm(this.url + '/faxStatus', this, function(form) {
    form.append('id', String(id));
    form.append('api_key', this.api_key);
    form.append('api_secret', this.api_secret);
  });
};

// Return Express middleware for receiving fax callbacks from
// Phaxio. It will mount itself on the right path based on the
// callback_url you configured.
//
// To listen for these repsonses, do:
//
//
PhaxioAPI.prototype.middleware = function() {
  // These fields are more useful to consumers as parsed values. `fax`
  // is json. `is_test` and `success` are booleans, which we can also
  // just treat as json.
  var parsedFields = ['fax', 'is_test', 'success'];
  var middleware = express.Router();
  var self = this;

  if (!this.callback_url) {
    throw new Error("must configure a callback_url to use Phaxio.middleware");
  }

  middleware.use(this.callback_url.pathname, multer({ limits: { files: 0 } }));
  middleware.post(this.callback_url.pathname, function(req, res) {
    var output = {}, field, value;
    for (field in req.body) {
      value = req.body[field];
      if (parsedFields.indexOf(field) !== -1){
        try {
          value = JSON.parse(value);
        } catch(err) {
          res.status(400).send('Unable to parse field ' + field).end();
          return;
        }
      }
      output[field] = value;
    }
    self.emit('sent', output);
    res.status(200).end();
  });
  return middleware;
};

function splitOptions(opts) {
  var phaxio = {};
  var filename = {};
  if (opts) {
    for (var key in opts) {
      if (key === 'contentType' || key === 'filename') {
        filename[key] = opts[key];
      } else {
        phaxio[key] = opts[key];
      }
    }
  }
  return {phaxio: phaxio, filename: filename};
}

function postForm(url, context, fillForm){
  return new Promise(function(resolve, reject) {
    var r = request.post(url, function (err, httpResponse, body) {
      if (err) {
        reject(err);
        return;
      }
      var response = JSON.parse(body);
      if (httpResponse.statusCode >= 400 || !response.success) {
        reject(body);
      } else {
        resolve(body);
      }
    });
    fillForm.call(context, r.form());
  });
}

module.exports = PhaxioAPI;
