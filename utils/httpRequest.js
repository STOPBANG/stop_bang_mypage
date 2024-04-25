const http = require('http');

module.exports = {
  httpRequest: (params, body) => {
    return new Promise(function (resolve, reject) {
      const clientRequest = http.request(params, incomingMessage => {
        // Response object.
        let response = {
          statusCode: incomingMessage.statusCode,
          headers: incomingMessage.headers,
          body: []
        };

        // Collect response body data.
        incomingMessage.on('data', chunk => {
          response.body.push(chunk);
        });

        // Resolve on end.
        incomingMessage.on('end', () => {
          if (response.body.length) {

            response.body = response.body.join();

            try {
              response.body = JSON.parse(response.body);
            } catch (error) {
              // Silently fail if response is not JSON.
            }
          }

          resolve(response);
        });
      });
      
      // Reject on request error.
      clientRequest.on('error', error => {
        reject(error);
      });

      clientRequest.on('close', () => {
        console.log('Sent message to db microservice.');
      });

      // Write request body if present.
      if (body) {
        clientRequest.write(JSON.stringify(body));
      }

      // Close HTTP connection.
      clientRequest.end();
    });
  }
}