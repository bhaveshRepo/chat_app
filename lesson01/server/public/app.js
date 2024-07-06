const socket = io('ws://localhost:3500');

// selectors with ids
const msgInput  = document.querySelector("#message");
const nameInput = document.getElementById("name");
const chatRoom  = document.getElementById("room");

// selectors with classes
const activity = document.querySelector(".activity");
const userList = document.querySelector(".user-list");
const roomList = document.querySelector(".room-list");
const chatDisplay = document.querySelector(".chat-display");


function sendMessage(e) {
    e.preventDefault()
    if (msgInput.value && nameInput.value && chatRoom.value) {
        console.log("message emited");
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        });
        msgInput.value = ""
    }
    msgInput.focus()
}

function enterRoom(e){
    e.preventDefault();

    if(nameInput.value && chatRoom.value){
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: chatRoom.value
        })
    }
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage);

document.querySelector('.form-join')
    .addEventListener('submit', enterRoom);

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value);
})

// Listen for messages 
socket.on("message", ( data ) => {
    activity.textContent = "";
    const {name, text, time} = data;

    const li = document.createElement('li');
    li.className = 'post'

    if(name === nameInput.value ) li.className =  'post post--left';
    if(name !== nameInput.value && name !== 'Admin') li.className = 'post post--right'

    if(name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput.value
            ? 'post__header--user'
            : 'post__header--reply'}
            ">
            <span class="post__header--name>">${name}</span>
            <span class="post__header--time>">${time}</span>
            </div>
            <div class="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class = "post__text">${text}</div>`
    }

    document.querySelector('.chat-display').appendChild(li);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
})



let activityTimer;

socket.on("activity", name => {
    activity.textContent = `${name} is typing...`

    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000)
})

socket.on('userList', ({ users }) => {
    showUsers(users);
})

socket.on('roomList', ({ rooms }) => {
    showRooms(rooms);
})

function showUsers(users){
    userList.textContent = ''
    if (users) {
        userList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`
        console.log(users);
        users.forEach((user, i) => {
            userList.textContent += ` ${user.name}`
            if(users.length > 1 && i !== users.length - 1){
                userList.textContent += ","
            }
        })
    }
}

function showRooms(rooms){
    roomList.textContent = ''
    if (rooms) {
        roomList.innerHTML = '<em>Active Rooms:</em>'
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`
            if(rooms > 1 && i !== rooms.length - 1){
                roomList.textContent += ","
            }
        })
    }
}
