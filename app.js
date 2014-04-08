var app = require('express.io')()
var mongoose = require('mongoose');
var users = {};

app.http().io()

var io = app.io;

mongoose.connect('mongodb://localhost/chat', function(err) {
	if(err) {
		console.log(err);
	} else {
		console.log('Connected to MongoDB.');
	}
});

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now},
});

var Chat = mongoose.model('Message', chatSchema);

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket) {
	var query = Chat.find({});
	query.sort('-created').limit(8).exec(function(err, data) {
		if(err) {
			throw err;
		} else {
			socket.emit('load old msgs', data);
		}
	});

	function updateNicknames() {
		io.sockets.emit('usernames', Object.keys(users));
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
					io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
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

app.listen(7076)