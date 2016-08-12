// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var passport = require('passport');
var flash    = require('connect-flash'); // store and retrieve messages in session store
var socketIo = require('socket.io')
var jquery = require('jquery');
var morgan       = require('morgan'); // logger
var cookieParser = require('cookie-parser'); // parse cookies
var bodyParser   = require('body-parser'); // parse posts
var session      = require('express-session'); // session middleware

//var http = require('http').Server(app);
var http = require('http');
var moment = require('moment');
app.use(express.static(__dirname + '/public'));
require('./config/passport')(passport); // pass passport for configuration
var verboseServer = true;
// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({ secret: 'ilovechocolatepeanutbuttercups' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

//socketIo======================================================================
var server = http.createServer(app);
var io = socketIo.listen(server);

var line_history = [];

var clientInfo = {};

// Sends current users to provided socket
function sendCurrentUsers(socket) {
    var info = clientInfo[socket.id];
    var users = [];

    if (typeof info === 'undefined') {
        return;
    }

    Object.keys(clientInfo).forEach(function(socketId) {
        var userInfo = clientInfo[socketId];

        if (info.room === userInfo.room) {
            users.push(userInfo.name);
        }
    });

    socket.emit('message', {
        name: 'System',
        text: 'Current users: ' + users.join(', '),
        timestamp: moment().valueOf()
    });
}

// io start



io.on('connection', function(socket) {
    verboseServer && console.log('User connected via socket.io!');
   for (var i in line_history) {
      socket.emit('draw_line', { line: line_history[i] } );
   }
    socket.on('disconnect', function() {
        var userData = clientInfo[socket.id];
        verboseServer && console.log("disconnect");
        if (typeof userData !== 'undefined') {
            socket.leave(userData.room);
            io.to(userData.room).emit('message', {
                name: 'System',
                text: userData.name + ' has left the room.',
                timestamp: moment().valueOf()
            });
            delete clientInfo[socket.id];
        }
    });
   // add handler for message type "draw_line".
   socket.on('draw_line', function (data) {
      // add received line to history 
      line_history.push(data.line);
      // send line to all clients
      io.emit('draw_line', { line: data.line });
   });
    socket.on('joinRoom', function(req) {
        clientInfo[socket.id] = req;
        socket.join(req.room);
        socket.broadcast.to(req.room).emit('message', {
            name: 'System',
            text: req.name + ' has entered the room.',
            timestamp: moment().valueOf()
        });
    });

    socket.on('message', function(message) {
        verboseServer && console.log('Message received: ' + message.text);
        if (message.text === '@currentUsers') {
            sendCurrentUsers(socket);
        } else {
            message.timestamp = moment().valueOf();
            io.to(clientInfo[socket.id].room).emit('message', message);
        }
    });

    // timestamp property - JavaScript timestamp (milliseconds)

    socket.emit('message', {
        name: '',
        text: 'Session started',
        timestamp: moment().valueOf()
    });
});


// -------------------OLD CODE -------------------
/*io.on('connection', function(socket) {
    for (var i in line_history) {
        socket.emit('draw_line', {line: line_history[i]});
    }
    socket.on('draw_line', function(data){
        line_history.push(data.line);
        io.emit('draw_line', {line: data.line});
    });
});
*/
// launch ======================================================================
server.listen(port);
console.log('app listening on ' + port);



