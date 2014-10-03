var request = require('request');
require('es6-promise').polyfill();

function PhaxioAPI(config){
  if (!(this instanceof PhaxioAPI)) {
    return new PhaxioAPI(config);
  }
  this.url = config.url || 'https://api.phaxio.com/v1';
  if (!config.api_key) {
    throw new Error("Must configure api_key");
  }
  this.api_key = config.api_key;
  if (!config.api_secret) {
    throw new Error("Must configure api_secret");
  }
  this.api_secret = config.api_secret;
}

PhaxioAPI.prototype = {
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
  send: function(phoneNumber, opts) {
    var args = splitOptions(opts);
    return postForm(this.url + '/send', this, function(form) {
      form.append('to', String(phoneNumber));
      form.append('api_key', this.api_key);
      form.append('api_secret', this.api_secret);
      for (var key in args.phaxio) {
        if (key === 'stream') {
          form.append('filename', args.phaxio[key], args.filename);
        } else {
          form.append(key, args.phaxio[key]);
        }
      }
    });
  }

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
