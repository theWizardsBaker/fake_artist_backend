import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import randomstring from "randomstring";
import { MongoClient } from "mongodb";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: {
		origin: '*'
	}
});

app.get('/', (req, res) => {
    res.json({ AGAIN: true })
});

io.on("connection", async (socket) => {
  socket.on('game:find', () => {
  	socket.emit('game_found')
  });

  socket.on('game:create', () => {
  	const gameKey = randomstring(5)

  });
  // {
  //   id: 6,
  //   name: "Jeanne",
  //   color: "#ffffff",
  //   isReady: true,
  // },
  socket.on('lobby:join', () => {
  	console.log('join lobby')
  });
});

httpServer.listen(3000);