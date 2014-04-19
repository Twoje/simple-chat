// Modules
var express = require('express.io');
var app = express().http().io();
var mongoose = require('mongoose');

// Config
var db = require('./config/db');
var port = process.env.PORT || 5000;

mongoose.connect(db.url, function (err, res) {
  if (err) {
  	console.log ('ERROR connecting to: ' + db.url + '. ' + err);
  } else {
  	console.log ('Succeeded connected to: ' + db.url);
  }
});

// Heroku won't actually allow us to use WebSockets
// so we have to setup polling instead.
// https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
app.set("transports", ["xhr-polling"]);
app.set("polling duration", 10);
app.use(express.static(__dirname + '/public'));

var users = {};

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now},
});

var Chat = mongoose.model('Message', chatSchema);

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/index.html');
});

app.io.on('connection', function(socket) {
	var query = Chat.find({});
	query.sort('-created').exec(function(err, data) {
		if(err) {
			throw err;
		} else {
			socket.emit('load old msgs', data);
		}
	});

	function updateNicknames() {
		socket.emit('usernames', Object.keys(users));
	}

	socket.on('new user', function(data, callback) {
		if(data in users) {
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});

	socket.on('send message', function(data, callback) {
		var msg = data.trim();
		if(msg.substr(0, 3) === '/w ') {
			// Send whisper
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1) {
				var whisperUser = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(whisperUser in users) {
					users[socket.nickname].emit('whisper', {msg: msg, nick: "To " + whisperUser})
					users[whisperUser].emit('whisper', {msg: msg, nick: "From " + socket.nickname});
				} else {
					callback({msg:'Enter a valid user.', nick: 'Error'});
				}
			} else {
				callback({msg:'Please enter a message for your whisper.', nick: 'Error'});
			}
		} else {
			// Send global message
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err) {
				if(err) {
					throw err;
				} else {
					socket.emit('new message', {msg: msg, nick: socket.nickname});
				}
			});
		}
	});
	socket.on('disconnect', function(data) {
		if(!socket.nickname) {
			return;
		}
		delete users[socket.nickname];
		updateNicknames();
	});
});

app.listen(port)