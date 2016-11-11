var express = require('express');
var	app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var users = {};
var userCounter = 0;
var currentUser = null;

server.listen(3000);

app.get('/', function( req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/:id', function( req, res) {
    res.sendFile(__dirname + '/chatwindow.html');
});

app.get('/status', function( req, res) {
    if (req.url === '/status') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        var responseObject = {
            currentClients: userCounter
        }
        res.end(JSON.stringify(responseObject));
    }

});
app.use("/static", express.static(__dirname + '/static'));

io.sockets.on('connection',function(socket){
    socket.on('new user', function(data, callback){
        if (data in users){
            callback(false);
        } else {
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            currentUser = socket.nickname;
            socket.emit('set current user', currentUser);
            userCounter++;
            updateNicknames();
        }
    });

    function updateNicknames(){
        io.sockets.emit('showOnlineUsers',Object.keys(users));
    }
    socket.on('send message', function(data, callback){
        var msg = data.trim();
        if(msg.substr(0,3) === '/w '){
            msg = msg.substr(3);
            var ind = msg.indexOf(' ');
            if(ind !== -1){
                var name = msg.substr(0, ind);
                var msg = msg.substring(ind + 1);
                if(name in users){
                    users[name].emit('whisper',{msg: msg, nick: socket.nickname});
                    users[socket.nickname].emit('whisper',{msg: msg, nick: socket.nickname}); //kendine gönder
                } else {
                    callback('Error! Enter a valid user');
                }
            } else {
                callback('Error! Please enter a message for your whisper');
            }
        }
    });

    socket.on('disconnect', function (data) {
        if(!socket.nickname) return;
        delete users[socket.nickname];
        userCounter--;
        updateNicknames();
    });

    socket.on('writing', function (data) {
        var current_chatter = data.current_chatter;
        var current_user = data.current_user;

        users[current_chatter].emit('writing',current_user);
    });
    socket.on('not writing', function (data) {
        var current_chatter = data.current_chatter;
        var current_user = data.current_user;

        users[current_chatter].emit('not writing',current_user);
    });

});