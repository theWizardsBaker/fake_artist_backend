import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";
import { loadCategories } from "./category.js"

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: {
		origin: '*'
	}
});

// load categories from CSV file
loadCategories();

app.get('/', (req, res) => {
    res.json({ AGAIN: true })
});

io.on("connection", (socket) => {
  socket.on('game:find', () => {

  	socket.emit('game_found')
  });

  socket.on('game:create', () => {


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