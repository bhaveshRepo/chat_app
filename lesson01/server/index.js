import express from "express"
import path from "path"
import { Server } from "socket.io"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin"

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, 3500, () => console.log(`Server is listening on port ${PORT}`));

// state for user
const UserState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})


io.on('connection', socket => {

    console.log(`User id ${socket.id} connected`);

    // emitting msg to only user who is connected
    // this socket object is associated to the user who is connected; 
    // socket.emit only emits to the user who is connected;

    socket.emit('message', buildMessage(ADMIN, "Welcome to chat app"));

    socket.on('enterRoom', ({ name, room }) => {
        //leave previoud room
        const prevRoom = getUser(socket.id)?.room
        
        if(prevRoom){
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMessage(ADMIN, `${name} has left the room`))
        }

        const user = activateUsers(socket.id, name, room);

        //cannot update previous rom list after updating the state
        if(prevRoom){
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            })
        }

        //join room
        socket.join(user.room);

        //message to user who joins
        socket.emit('message', buildMessage(ADMIN, `You have joined the ${user.room} chat room`));

        //to everyone else
        socket.broadcast.to(user.room).emit('message', buildMessage(ADMIN, `${user.room} has joined the room`));

        //update user list or room
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room)})

        //update rooms list for everyone
        io.emit('roomList', { rooms: getAllActivityRooms()})
    })

    //when user disconnects this would go to all other

    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if(user){
            io.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has left the room`))

            io.to(user.room).emit('userList', { users: getUsersInRoom(user.room)});

            io.emit('roomList', {
                rooms: getAllActivityRooms()
            })
        }

        console.log(`User ${socket.id} disconnected`)
    })

    // inform others that a user has connected;
    // socket.broadcast emit to other users except the one who is connected;
    // socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} connected`);

    //Listening for message event;
    socket.on('message', ({ name, text}) => {

        const room = getUser(socket.id)?.room;

        console.log(room);
        if(room){
            io.to(room).emit('message', buildMessage(name, text));
        }
        // io.emit emits message to each and every client connected to the server;
        // as io is the global server object;
        // io.emit('message', `${socket.id.substring(0, 5)}: ${data}`)
    })

    //Listen for activity event;
    socket.on('activity', name => {
        const room = getUser(socket.id)?.room;
        if(room){
            socket.broadcast.to(room).emit('activity', name);
        }
    })
})


function buildMessage(name, text) {
    return {
        name, text, time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

//users function
function activateUsers(id, name, room){
    const user = {id, name, room};
    UserState.setUsers(
        // filtering the user so that the user should not be their already
        [...UserState.users.filter(user => user.id !== id), user]
    )
    return user
}

function userLeavesApp(id){
    UserState.setUsers(
        UserState.users.filter(user => user.id != id)
    )
}

function getUser(id){
    return UserState.users.find(user => user.id === id);
}

function getUsersInRoom(room){
    return UserState.users.filter(user => user.room === room);
}

function getAllActivityRooms() {
    return Array.from(new Set(UserState.users.map(user => user.room)));
}