// 🚀 WhatsApp-style Chat App Server (with Typing Indicator & MongoDB persistence)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://RR060805:ShriRam@cluster1.mdf7vhk.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster1')
const Message = mongoose.model('Message', {
  from: String,
  to: String,
  text: String,
  time: String,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = {}; // { socket.id: username }

app.use(express.static('public'));

function broadcastUserList() {
  const usernames = Object.values(users);
  io.emit('user list', usernames);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('set username', (username) => {
    users[socket.id] = username;
    broadcastUserList();
    socket.emit('username confirmed', username);
    console.log(`User set: ${username} (${socket.id})`);
  });

  socket.on('private message', async ({ to, message }) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Save to DB
    await Message.create({
      from: users[socket.id],
      to,
      text: message,
      time,
    });
    // Send to recipient if online
    const recipientSocketId = Object.keys(users).find(id => users[id] === to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private message', {
        from: users[socket.id],
        message,
      });
    }
  });

  socket.on('get messages', async ({ withUser }) => {
    const myName = users[socket.id];
    const messages = await Message.find({
      $or: [
        { from: myName, to: withUser },
        { from: withUser, to: myName }
      ]
    }).sort({ _id: 1 });
    socket.emit('chat history', messages);
  });

  socket.on('typing', ({ to }) => {
    const recipientSocketId = Object.keys(users).find(id => users[id] === to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', {
        from: users[socket.id]
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', users[socket.id]);
    delete users[socket.id];
    broadcastUserList();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});