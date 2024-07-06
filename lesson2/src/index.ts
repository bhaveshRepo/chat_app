import express from "express"
import { Server } from 'socket.io'
import path from "path";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

const app = express();

// dirname and path is pending

const expressServer = app.listen(3000, () => console.log("New express server is running"));

// constant values
const ADMIN: string = "Admin"
//User state;
type User = {
    id: string,
    name: string,
    room: string,
}

interface UserState {
    users: User[],
    setUser(param: User[]): User[]
}

const UserState: UserState = {
    users: [],
    setUser: function(newUserArray){
        return this.users =  newUserArray;
    }
}

const io = new Server(expressServer);

io.on('connection', socket => {
    console.log(`User id ${socket.id} connected.........`);

    // Message to user on Joining the Chat App
    socket.emit('message', buildMessage(ADMIN, `Welcome to Chat App`));

    //when user emits enterRoom event from the frontend
    socket.on('enterRoom', ({ name, room}) => {
        // retrieve previous room name from userstate if exists;
        const previousRoom = getUser(socket.id)?.room

        if(previousRoom){
            socket.leave(previousRoom);
            io.to(previousRoom).emit('message', buildMessage(ADMIN, `${name} has left the room`));
        }

        const user: User = activateUser(socket.id, name, room);

        if(previousRoom){ // review functionality of this code
            io.to(previousRoom).emit('userList', { users: getUsersInRoom(previousRoom)})
        }

        //join new room
        socket.join(user.room)
        
        //emit message only to user
        socket.emit('message', buildMessage(ADMIN, `You have joined ${user.room} room`));

        //emit message to all users in room except user itself
        socket.broadcast.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has joined the room`));

        //update userlist of room
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room)})

        //update room list for everyone
        io.emit('roomList', { rooms: getAllActivityRoom()})
    })

    //when user disconnects
    socket.on('message', ({name, text}) => {
        const room = getUser(socket.id)?.room

        if(room){
            io.to(room).emit('message', buildMessage(name, text));
        }
    })

    //Listening for activity event
    socket.on('activity', name => {
        const room = getUser(socket.id)?.room
        if(room){
            socket.broadcast.to(room).emit('activity', name);
        }
    })
})

//message
type message = { name: string, text: string, time: string};

function buildMessage(name: string, text: string): message {
    return {
        name, 
        text, 
        time: new Intl.DateTimeFormat('default', {
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        }).format(new Date())
    }
}

//adding user to userState
function activateUser(id: string, name: string, room: string): User{
    const user: User = {id, name, room};
    UserState.setUser([...UserState.users.filter(user => user.id !== id), user])
    return user;
}

//User leaves the app (socket disconnect)
function userLeavesApp (id: string): User[] {
    return UserState.users.filter(user => user.id != id);
}

//retrieve user based on user id
function getUser(id: string): User | undefined {
    return UserState.users.find(user => user.id === id);
}

//get array of users based on room
function getUsersInRoom(room: string): User[]{
    return UserState.users.filter(user => user.room === room);
}

//get array of all the rooms from user array
//set is used so that no room name gets repeated;

function getAllActivityRoom(): string[] {
    return Array.from(new Set(UserState.users.map(user => user.room)))
}

