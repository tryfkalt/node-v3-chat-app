const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
//socketio expects a raw http server
// thats why we refactored the code to run on raw http server and put our express app in there
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options }) // the user id comes from socket id and is unique for each connection 

        if (error) {
            return callback(error)
        }
        //socket join works only in server and joins the rooms with the parameter provides
        // we use the callback to go back to the client and acknowledge that the msg has arrived
        socket.join(user.room)
        //io.to.emit emits an event to everybody in a specific room
        //socket.broadcast.to.emit same as broa..emit but only to a room
        socket.emit('message', generateMessage('Admin', 'Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) // broadcast sends an event to all clients except the one that connects (current)
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    // the disconnect happens inside io.on
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('Admin', 'message', generateMessage(`${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



//let count = 0;

// // here is what happens when a client connects to the server
// // first arg is an event and 2nd is the func to run when event happends/ its like event listener
// io.on('connection', (socket) => { //socket is an obj that contains info about that new connection 
//     console.log('New WebSocket Connection') // to connect we need to load in the client side of the socketio lib which we do in the html
//     // after the event name , every arg in the server side (emit) goes in the callback func in the client side as an arg
//     socket.emit('countUpdated', count) //emit sends back data to client / send "event"

//     socket.on('increment', () => {
//         count++
//         //socket.emit('countUpdated', count) //when emit we send event to a single connection
//         io.emit('countUpdated', count) // emit to every connection
//     })
// })

server.listen(port, () => {
    console.log('Server is up on port: ' + port)
})

