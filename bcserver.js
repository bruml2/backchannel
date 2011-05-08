/**
 *  bcserver.js; ruml; May 6, 2011;
 *  based on example from socket.io.node repo: server.js
 */

/**
 *  BAD BUG: in browser, forgot to issue the socket.connect();
 *  FLASH: Firefox 4 ships with websockets enables but unavailable because
 *         of a security firewall; use "about:config" to set
 *         network.websocket.override-security-block to true;
 *         Safari 5.0.5 works out of the box; 
 *
 *  NOW: client disconnects after about 15 seconds;
 *       - connecting with flashsocket"; there's an error in socket.io.js:
 *           self.__flash.getReadyState is not a function  line 1651
 *
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
      console.log("==================================");
      console.log("Handling request for bcmodule.html");
      // TODO: get param value 'username':
      var query = url.parse(request.url, true).query;
      console.log("URL is: " + request.url);
      console.log("Query is: " + util.inspect(query));
      console.log("username param is: " + query['username']);
      console.log("----------------------------------");
      
      fs.readFile(__dirname + pathname, function(err, data){
        if (err) { return send404(pathname, response); }
        response.writeHead(200, {'Content-Type': 'text/html'})
        response.write(data, 'utf8');
        response.end();
      });
      break;
      
    case '/socket.io.js':
      fs.readFile(__dirname + pathname, function(err, data){
        if (err) { return send404(pathname, response); }
        response.writeHead(200,
          //{'Content-Type': pathname == 'json.js' ? 'text/javascript' : 'text/html'})
          {'Content-Type': pathname.slice(-3) == '.js' ? 'text/javascript' : 'text/html'})
        response.write(data, 'utf8');
        response.end();
      });
      break;

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

function assembleTopAndRecentPostArrays() {
  recentPosts = allPosts.reverse();
  // should be sorting allPosts by votevalue;
  topPosts = allPosts;
}

var dummyPost = { 
  objtype: "post",
  meetingid: 888,
  userid: 12345,
  username: "Bill Jones",
  useraffil: "student",
  postid: 999,
  body: "This question is the body of the post?",
  posvotes: 1,
  negvotes: 1,
  isdeleted: false,
  ispromoted: false,
  isdemoted: false,
  created: "2011-05-04 14:35:21" };
topPosts = [ dummyPost ];
  
serverListener.on('connection', function(client){
  // ====> we're in the connection callback: executes once;
  // send() sends a message TO THE CLIENT browser that just connected;
  // when browser sees that it contains a 'topPosts' property, it is treated specially;
  client.send( { "topPosts": topPosts } );
  client.send( { "recentPosts": recentPosts } );
  console.log("Sent " + topPosts.length + " accumulated topPosts.");
  console.log("Sent " + recentPosts.length + " accumulated recentPosts.");
  // sends a message to all other clients; equivalent to:
  //    Listener::broadcast(message, client.sessionid);
  client.broadcast({ "announcement": 'Hey! ' + client.sessionId + ' connected' });
  
  client.on('message', function(message){
    if (message.objtype == "post") {
      console.log("POST received from client: " + client.sessionId);
      console.log(message);
      allPosts.push(message);
      console.log("now have " + allPosts.length + " posts in all");
      assembleTopAndRecentPostArrays();
      client.broadcast( { "topPosts": topPosts } );
      client.broadcast( { "recentPosts": recentPosts } );
    } else if (message.objtype == "vote") {
      console.log("VOTE received from client: " + client.sessionId);
      // code here to tally the vote and send out new top and recent arrays;
    } else {
      console.log("UNKNOWN message received from client: " + client.sessionId);
    }
  });

  client.on('disconnect', function(){
    // console.log("Client: " + client.sessionId + " disconnected");
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});
