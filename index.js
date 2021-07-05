const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

var views = __dirname + '/views';

app.get('/player/:player', (req, res) => {
    res.sendFile(views+'/player.html');
});

app.get('/player/:player/:i', (req, res) => {
    res.redirect('/player');
})

app.get('/player', (req, res) => {
    res.send("yes");
});


var users = [];
var gameStarted = false;

var tasks = [
    {index: 0, name: "task 1", code: "0000", common: true},
    {index: 1, name: "task 2", code: "0001", common: false},
    {index: 2, name: "task 3", code: "0002", common: false},
    {index: 3, name: "task 4", code: "0003", common: false},
    {index: 4, name: "task 5", code: "0004", common: false},
    {index: 5, name: "task 6", code: "0005", common: false},
];

io.on('connection', (client) => {
    console.log('Connected: ' + client.id);
    var userIndex = 0;

    client.on('requestJoin', (data) => {
        var userNotExist=true;
        users.forEach(element => {
            if(element.name == data) {
                users[element.index].socket = client.id
                userIndex = element.index;
                client.emit('returnJoin', userIndex);
                if(gameStarted) client.emit('gameStart', users[element.index]);
                userNotExist=false;
            }
        });
        if(userNotExist) {
            var newUser = {
                name: data,
                socket: client.id,
                impostor: false,
                index: 0,
                tasks: null,
            }                                                                                                                              
            userIndex = users.push(newUser)-1;
            users[userIndex].index=userIndex;
            client.emit('returnJoin', userIndex);
        }
    });
    
    client.on('getTask', (data) => {
        users[userIndex].tasks.forEach(element => {
            if(element.taskId == data) client.emit('returnTask', tasks[data], element.done);
        })
    });

    client.on('checkTask', (data) => {
        users[userIndex].tasks.forEach(element => {
            if(tasks[element.taskId].code == data) {
                users[userIndex].tasks[element.taskId].done=true;
                client.emit('returnTask', tasks[element.taskId], element.done);
            }
        })
        
    })

    client.on('invokeInit', (data) => {
        initGame();
    });
    client.on('invokeStart', (data1, data2) => {
        startGame(data1, data2);
    })

    
});

var initGame = () => {
    users = [];

    io.emit('gameRestart', 0);
    gameStarted = false;
}

var startGame = (impostorNum, taskNum) => {
    for (let i = 0; i < users.length; i++) {
        users[i].impostor = false;
    }

    var impostors = [];
    for(let i = 0; i < impostorNum; i++) {
        a = users[Math.floor(Math.random() * users.length)];
        if(impostors.includes(a.index)) i--;
        else impostors.push(a.index);
    }
    impostors.forEach(element => {
        users[element].impostor=true;
    })

    for (let i = 0; i < users.length; i++) {
        users[i].tasks = [
            {taskId: 0, done: false},
            {taskId: 1, done: false},
            {taskId: 2, done: false},
            {taskId: 3, done: false},
            {taskId: 4, done: false},
            {taskId: 5, done: false},
        ]
    }

    users.forEach(element => {
        io.to(element.socket).emit('gameStart', element);
    });
    gameStarted = true;
}

server.listen(3000);