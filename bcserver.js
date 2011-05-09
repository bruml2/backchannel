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
 
var 
  http = require('http'),
  url  = require('url'),
  // var qstr = require('querystring');
  fs   = require('fs'),
  util = require('util'),
  // require.path.unshift('./lib');
  io   = require('./lib/socket.io'),
  // path is used by paperboy;
  path     = require('path'),
  paperboy = require('./lib/paperboy'),
  // used for uniqueId()
  _        = require('./lib/underscore'),
  
  GLOBALS = { "meetingID": "888", "nextPostID": 1 },
  PORT = 8080,
  STATIC = path.join(path.dirname(__filename), 'static');
    
var server = http.createServer(function(request, response){
  // console.log("REQUEST for " + request.url);
  var ip = request.connection.remoteAddress;
  var pathname = url.parse(request.url).pathname;
  var query    = url.parse(request.url, true).query;
  // we need to serve:
  //  /, /bcmodule.html, favicon.ico, arrow_up.png, arrow_dn.png,
  //   
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
    
    case '/username':
      // temporary;
      // will have a querystring of "username=<value>";
      var query = url.parse(request.url, true).query;
      GLOBALS['username'] = query['username'];

      break;
          
    default:
      if (pathname == '/bcmodule.html') {
        GLOBALS['username'] = query['username'];    
        if (typeof(GLOBALS['username']) != 'undefined') {
          console.log('Captured username: "' + GLOBALS['username'] + '"');
        } else {
          console.log('NO USERNAME found');
        }
      } 
      paperboy
      .deliver(STATIC, request, response)
      // second arg is milliseconds!!
      .addHeader('Expires', 300)
      .addHeader('X-PaperRoute', 'Node')
      .before(function() {
        // can cancel delivery by returning false;
        // console.log('Received Request');
      })
      .after(function(statCode) {
        log(statCode, request.url, ip);
      })
      .error(function(statCode, msg) {
        response.writeHead(statCode, {'Content-Type': 'text/plain'});
        response.end("Error " + statCode);
        log(statCode, request.url, ip, msg);
      })
      .otherwise(function(err) {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.end('404 - file "' + pathname + '" not found on chat server');
        log(404, request.url, ip, err);
      });
  } // switch;
}); // http.createServer();

// for paperboy;
function log(statCode, url, ip, err) {
  var logStr = statCode + ' - ' + url + ' - ' + ip;
  if (err)
    logStr += ' - ' + err;
  console.log(logStr);
}

server.listen(PORT);
console.log("==============================");
console.log("Server listening on port " + PORT + "!");

// listen for socket.io traffic on same port as http traffic;
var serverListener = io.listen(server);
// this buffer collects all the messages since the start of the server; when a
//   new client connects, the buffer is sent first thing.
var allPosts = [];
// var topPosts = [];
// var recentPosts = [];

function getNextUniquePostID() {
  var nextID = GLOBALS["nextPostID"];
  GLOBALS["nextPostID"] += 1;
  return GLOBALS["meetingID"] + "-" + nextID;
}
function assembleTopAndRecentPostArrays() {
  console.log("All Posts:");
  allPosts.forEach(function(el) { console.log(el.postid + " - " + el.posvotes + " - " + el.created) });
  /*
  topPosts = allPosts.sort(sortPostsByVoteRankDescending);
  console.log("Top Posts:");
  topPosts.forEach(function(el) { console.log(el.postid + " - " + el.posvotes + " - " + el.created) });
  
  recentPosts = allPosts.sort(sortPostsByCreatedDescending);
  console.log("Recent Posts:");
  recentPosts.forEach(function(el) { console.log(el.postid + " - " + el.posvotes + " - " + el.created) });
  */
}
function sortPostsByVoteRankDescending(a, b) {
  aRank = a.posvotes - (a.negvotes * 0.5);
  bRank = b.posvotes - (b.negvotes * 0.5);
  // for descending, reverse usual order; 
  return bRank - aRank;
}
function sortPostsByCreatedDescending(a, b) {
  // for descending, reverse usual order; 
  return b.created - a.created;
}

// temporary: for testing;
var dummyPosts = [ { 
  objtype: "post",
  meetingid: GLOBALS["meetingID"],
  userid: 12345,
  username: "Bill Jones",
  useraffil: "student",
  postid: getNextUniquePostID(),
  body: "This is dummy post one: 1111111.",
  posvotes: 1,
  negvotes: 1,
  isdeleted: false,
  ispromoted: false,
  isdemoted: false,
  created: (new Date).getTime() 
}, {
  objtype: "post",
  meetingid: GLOBALS["meetingID"],
  userid: 12345,
  username: "George Smith",
  useraffil: "student",
  postid: getNextUniquePostID(),
  body: "This is dummy post two: 2222222.",
  posvotes: 5,
  negvotes: 2,
  isdeleted: false,
  ispromoted: false,
  isdemoted: false,
  created: (new Date).getTime() + 10000
} ];
allPosts = dummyPosts;
// assembleTopAndRecentPostArrays();
  
serverListener.on('connection', function(client){
  // ====> we're in the connection callback: executes once;
  // NB: when the sorting occurred outside the callback, it was not reflected in
  //     the actual order sent;  this way works!  [Why is this?]
  console.log("======== sending topPosts and recentPosts on connection event =======");
  var topPosts = allPosts.sort(sortPostsByVoteRankDescending);
  console.log("Top Posts:");
  topPosts.forEach(function(el) { console.log(el.postid + " - " + el.posvotes + " - " + el.created) });
  client.send( { "topPosts": topPosts } );

  var recentPosts = allPosts.sort(sortPostsByCreatedDescending);
  console.log("Recent Posts:");
  recentPosts.forEach(function(el) { console.log(el.postid + " - " + el.posvotes + " - " + el.created) });
  client.send( { "recentPosts": recentPosts } );

  console.log("Sent " + topPosts.length + " accumulated topPosts.");
  console.log("Sent " + recentPosts.length + " accumulated recentPosts.");
  console.log("======== done =======");
  // sends a message to all other clients; equivalent to:
  //    Listener::broadcast(message, client.sessionid);
  client.broadcast({ "announcement": 'Hey! ' + client.sessionId + ' connected' });
  
  client.on('message', function(message){
    if (message.objtype == "post") {
      console.log("POST received from client: " + client.sessionId);
      message.postid = getNextUniquePostID();
      console.log(message);
      allPosts.push(message);
      console.log("now have " + allPosts.length + " posts in all");

      client.send( { "announcement": "Server just got a new post" } );
      var topPosts = allPosts.sort(sortPostsByVoteRankDescending);
      client.send( { "topPosts": topPosts } );
      var recentPosts = allPosts.sort(sortPostsByCreatedDescending);
      client.send( { "recentPosts": recentPosts } );
      // client.broadcast( { "topPosts": topPosts } );
      // client.broadcast( { "recentPosts": recentPosts } );
    } else if (message.objtype == "vote") {
      console.log("VOTE received from client: " + client.sessionId);
      console.log(message);
      tallyVote(message.postid, message.direction);
      // code here to send out new top and recent arrays;

    } else {
      console.log("UNKNOWN message received from client: " + client.sessionId);
    }
  });

  client.on('disconnect', function(){
    // console.log("Client: " + client.sessionId + " disconnected");
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});
