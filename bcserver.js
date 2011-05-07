/**
 *  bcserver.js; ruml; May 6, 2011;
 *  based on example from socket.io.node repo: server.js
 */

/**
 *  Current awful situation: server starts up; sends log messages for:
 *    - listening for http traffic on 8080;
 *    - socket.io is accepting connections;
 *  BUT never get the connection event!
 */
 
var http = require('http');
var url  = require('url');
// var qstr = require('querystring');
var fs   = require('fs');
var util = require('util');
// require.path.unshift('./lib');
var io   = require('./lib/socket.io');
    
var server = http.createServer(function(request, response){
  var pathname = url.parse(request.url).pathname;
  switch (pathname){
    case '/':
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.write(
        '<h1>Welcome to the backchan.nl clone on node.js</h1>' +
        '<div style="margin: 3em auto; padding: 4em; ' +
        '            border: 3px solid blue; ' +
        '            width: 25em; text-align: center;">' +
        '<form action="/bcmodule.html" method="post">' +
        '  <label for="username">User handle: </label>' +
        '    <input type="text" id="username" value="bruml2" /><br /><br />' +
        '    <input type="submit" value="Send" />' +
        '</form></div>'
      );
      response.end();
      break;
    
    case '/bcmodule.html':
      console.log("----------------------------------");
      console.log("Handling request for bcmodule.html");
      // TODO: get param value 'username':
      var query = url.parse(request.url, true).query;
      console.log("URL is: " + request.url);
      console.log("Query is: " + util.inspect(query));
      console.log("username param is: " + query['username']);
      
      fs.readFile(__dirname + pathname, function(err, data){
        if (err) { return send404(pathname, response); }
        response.writeHead(200, {'Content-Type': 'text/html'})
        response.write(data, 'utf8');
        response.end();
      });
      break;
      
    default: send404(pathname, response);
  }
});

function send404(pathname, response) {
  response.writeHead(404);
  response.write('404 - file "' + pathname + '" not found on chat server');
  response.end();
};

server.listen(8080);
console.log("==============================");
console.log("Server listening on port 8080!");

// listen for socket.io traffic on same port as http traffic;
var serverListener = io.listen(server);
// this buffer collects all the messages since the start of the server; when a
//   new client connects, the buffer is sent first thing.
var allPosts = [];
var topPosts = [];
var recentPosts = [];
  
serverListener.on('connection', function(client){
  console.log("  Client: " + client.sessionId + " just connected");
  //console.log("Let's look at the client's listener's 'clientsIndex':\n" +
  //            "  ==> clients are indexed by their session ids\n" +
  //            util.inspect(client.listener.clientsIndex));
  
  // ====> we're in the connection callback: executes once;
  // send() sends a message TO THE CLIENT browser that just connected;
  // when browser sees that it contains a 'topPosts' property, it is treated specially;
  client.send({ "topPosts": topPosts });
  console.log("Sent " + topPosts.length + " topPosts:\n" + util.inspect(topPosts));
  // sends a message to all other clients; equivalent to:
  //    Listener::broadcast(message, client.sessionid);
  client.broadcast({ announcement: '=====> Hey! ' + client.sessionId + ' connected' });
  
  client.on('message', function(message){
    console.log("MESSAGE received from client: " + client.sessionId);
    var msg = { message: [client.sessionId, message] };
    allPosts.push(msg);
    topPosts.push(msg);
    // maximum of 15 messages in the buffer at once;
    if (buffer.length > 15) buffer.shift();
    client.broadcast(msg);
  });

  client.on('disconnect', function(){
    console.log("Client: " + client.sessionId + " disconnected");
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});
