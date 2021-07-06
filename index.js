const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

var views = __dirname + '/views';

app.use(express.static('public'));
app.get('/player/:player', (req, res) => {
    res.sendFile(views+'/player.html');
});

app.get('/player/:player/reported', (req, res) => {
    res.sendFile(views+"/reported.html");
})

app.get('/player', (req, res) => {
    res.sendFile(views+"/players.html");
});

app.get('/reactor', (req, res) => {
    res.sendFile(views+"/reactor.html");
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
        for (let i = 0; i < users[userIndex].tasks.length; i++) {
            if(tasks[users[userIndex].tasks[i].taskId].code == data) {
                users[userIndex].tasks[i].done=true;
                client.emit('returnTask', tasks[users[userIndex].tasks[i].taskId], users[userIndex].tasks[i].done);
            }
        };
        
    })

    client.on('invokeInit', (data) => {
        initGame();
    });
    client.on('invokeStart', (data1, data2) => {
        startGame(data1, data2);
    });
    client.on('reportBody', (data) => {
        io.emit('reportBody', data);
    });
    client.on('requestMeltdown', () => {
        io.emit('invokeMeltdown');
    });
    client.on('invokeNextRound', () => {
        io.emit('nextRound', 0);
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

    randomizeTasks(taskNum)

    users.forEach(element => {
        io.to(element.socket).emit('gameStart', element);
    });
    gameStarted = true;
}

var randomizeTasks = (numTasks) => {
    var numberOfPlayers = users.length;
    
    for (let i = 0; i < numberOfPlayers; i++) {
        users[i].tasks=[];
        users[i].tasks.push({taskId: 0, done:false});
        for (let j = 0; j < numTasks-1; j++) {
            searching=true;
            while(searching) {
                var p = 1+Math.floor(Math.random() * (tasks.length-1))
                var isUsed = false;
                users[i].tasks.forEach(element => {
                    if(p==element.taskId) isUsed=true;
                });
                if(!isUsed) {
                    users[i].tasks.push({taskId: p, done: false});
                    searching=false;
                }
            }
        }
    }
}

server.listen(3000);