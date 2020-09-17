var debug = require('debug')('angular2-nodejs:server');
var http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
// JWT-secret
const JWT_Secret = 'test-auth';
const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser);

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

var socketio = require('socket.io').listen(server);

socketio.on('connection', function (socket) {

  //temp delete socket from namespace connected map
  delete socketio.sockets.connected[socket.id];

  var options = {
    secret: JWT_Secret,
    timeout: 5000 // 5 seconds to send the authentication message
  }

  var auth_timeout = setTimeout(function () {
    // socket.emit('unauthorized','timeout');
    socket.disconnect('unauthorized');
  }, options.timeout || 5000);

  var authenticate = function (data) {
    clearTimeout(auth_timeout);
    jwt.verify(data.token, options.secret, options, function (err, decoded) {
      if (err) {
        // socket.emit('unauthorized','token inválido');
        socket.disconnect('unauthorized');
      }
      if (!err && decoded) {
        //restore temporarily disabled connection
        socketio.sockets.connected[socket.id] = socket;

        socket.decoded_token = decoded;
        socket.connectedAt = new Date();

        // Disconnect listener
        socket.on('disconnect', function () {
          console.info('SOCKET [%s] DISCONNECTED', socket.id);
        });

        console.log(`senha! ${socket.decoded_token.senha}`);
        console.log(`email! ${socket.decoded_token.email}`);

        if ('rep-hicaro@hotmail.com' == socket.decoded_token.email) {
          console.info('Sucesso no login');
          socket.on('join', function (data) {
            //joining
            socket.join(data.room);

            console.log(data.user + 'joined the room : ' + data.room);

            socket.broadcast.to(data.room).emit('new user joined', { user: data.user, message: 'has joined this room.' });
          });


          socket.on('leave', function (data) {

            console.log(data.user + 'left the room : ' + data.room);

            socket.broadcast.to(data.room).emit('left room', { user: data.user, message: 'has left this room.' });

            socket.leave(data.room);
          });

          socket.on('message', function (data) {

            io.in(data.room).emit('new message', { user: data.user, message: data.message });
          })
          console.info('SOCKET [%s] CONNECTED', socket.id);
          socket.emit('authenticated');

        } else {
          console.info('Erro no login');
          // socket.emit('unauthorized','erro login');
          socket.disconnect('unauthorized');
        }

      }
    })
  }

  socket.on('authenticate', authenticate);
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
