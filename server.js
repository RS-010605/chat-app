// 🚀 WhatsApp-style Chat App Server (with Typing Indicator)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

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
    console.log(`User set: ${username} (${socket.id})`);
  });

  socket.on('private message', ({ to, message }) => {
    const recipientSocketId = Object.keys(users).find(id => users[id] === to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private message', {
        from: users[socket.id],
        message,
      });
    }
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
