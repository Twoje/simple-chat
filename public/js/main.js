jQuery(function($) {
	var socket = io.connect();
	var $messageForm = $('#send-message');
	var $messageBox = $('#message');
	var $chat = $('#chat');
	var $nickForm = $("#setNick");
	var $nickError = $("#nickError");
	var $nickBox = $("#nickname");
	var thisNick;
	var shiftIsDown;

	function displayMessage(data, klass) {
		$chat.append("<span class=" + klass + "><span class='nick'>" + data.nick + ": </span>" + data.msg + "<br/>");
		$chat.scrollTop($chat[0].scrollHeight);
	}

	$nickForm.submit(function(e) {
		e.preventDefault();
		socket.emit('new user', $nickBox.val(), function(data) {
			if(data) {
				$("#nickWrap").hide();
				$("#contentWrap").show();
			} else {
				$nickError.html('That username is already taken! Try again.');
			}
		});

		thisNick = $nickBox.val();
		document.title = "simple chat - " + $nickBox.val();
		$nickBox.val('');
	});

	socket.on('load old msgs', function(data) {
		for(var i = data.length - 1; i >= 0; i--) {
			displayMessage(data[i], 'msg');
		}
	});

	socket.on('usernames', function(data) {
		var html = '';
		for(var i = 0; i < data.length; i++) {
			html += data[i] + "<br/>";
		}
		$("#users").html(html);
	});

	$messageBox.on('keydown', function(e) {
		if(e.keyCode == '16') {
			shiftIsDown = true;
		}
	});

	$messageBox.on('keyup', function(e) {
		if(e.keyCode == '16') {
			shiftIsDown = false;
		}
		if(e.keyCode == '13' && !shiftIsDown) {
			socket.emit('send message', $messageBox.text(), function(data) {
				displayMessage(data, 'error');
			});
			$messageBox.text('');
		}
	});

	socket.on('new message', function(data) {
		if(data.nick == thisNick) {
			displayMessage(data, 'usr-msg');
		} else {
			displayMessage(data, 'msg');
		}
	});

	socket.on('whisper', function(data) {
		displayMessage(data, 'whisper');
	});
});