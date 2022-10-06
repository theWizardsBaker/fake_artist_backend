import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect } from "./database.js";
import Category from "./models/category.js"

// setup express
const app = express();
const httpServer = createServer(app);
// setup socket.io
const io = new Server(httpServer, { 
  cors: {
		origin: '*'
	}
});
// setup mongodb
connect()
// load categories from CSV file
.then(() => Category.loadCategories())
// exit if connection fails
.catch(() => {
  console.log("could not establish a connection. Exiting");
  process.exit(0);
});
// basic landing page
app.get('/', async (req, res) => {
    console.log(await Category.findRandomCategory())
    res.send("Server is up")
});
// setup socket.io
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