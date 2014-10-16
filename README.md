This is an implementation of the Phaxio Fax API for node.

## Features:

 - properly streams your content to Phaxio, taking any arbitrary
   Readable stream.

 - returns promises

 - includes optional Express middleware for listening to callbacks
   from Phaxio and emitting `sent` events.

## Install

    npm install --save phaxio-api

## Synopsis

    var PhaxioAPI = require('phaxio-api');
    var phaxio = new PhaxioAPI({ api_key: '...', api_secret: '...' });
    var phoneNumber = '1235551212';

    // Stream a document
    phaxio.send(phoneNumber, {stream: fs.createReadStream(myFileName)})

    // Stream a document with optional filename, contentType, and knownLength
    phaxio.send(phoneNumber, {
      stream: anyReadableStream,
      contentType: 'application/pdf',
      filename: 'foo.pdf',
      knownLength: 1000 // This may be necessary when form-data
                        // can't tell the length of your readable stream.
    });

    // Send a string via phaxio's string_data options:
    phaxio.send(phoneNumber, {
      string_data: 'http://example.com/some_document',
      string_data_type: 'url'
    });

    // All other opts get passed through to phaxio's sendFax unchanged:
    phaxio.send(phoneNumber, {
      string_data: 'http://example.com/some_document',
      string_data_type: 'url',
      batch: 'true',
      batch_delay: '60'
    });

    // `send` returns a promise that resolves if the sendFax call succeeded.
    phaxio.send(phoneNumber, {stream: fs.createReadStream(myFileName)}).then(function(response) {
      console.log("Yay! Phaxio assigned id " + response.faxId);
    });

## Middlware for Callbacks

To confirm delivery, Phaxio can post a callback to you. To use this:

1. Set a callback URL, which must be absolute:

        var phaxio = new PhaxioAPI({ api_key: '...', api_secret: '...' , callback_url: 'https://example.com/fax_callback'});

2. Install the middleware in an Express application. Make sure it's
   not behind any authentication middleware.

        app.use(phaxio.middleware());

3. Listen for `sent` events:

        phaxio.on('sent', function(result) {
          if (result.success) {
            console.log("Fax number " + result.fax.id + " was sent successfully.");
          }
        });

