import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: {
		origin: '*'
	}
});

app.get('/', (req, res) => {
    res.json({ TEST: true })
});

io.on("connection", async (socket) => {
  socket.on('game:find', () => {
  	socket.emit('gameFound')
  });
  socket.on('game:create', () => {

  });
  socket.on('lobby:join', () => {
  	console.log('join lobby')
  });
});

httpServer.listen(3000);