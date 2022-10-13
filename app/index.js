import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect } from "./database.js";
import Category from "./models/category.js";
import { findGameLobby, createGameLobby } from "./lobby.js";

// setup express
const app = express();
const httpServer = createServer(app);

// setup socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONT_END_URL,
  },
});

// // setup mongodb
connect()
  // load categories from CSV file
  .then(() => Category.loadCategories())
  // exit if connection fails
  .catch(() => {
    console.log("could not establish a connection. Exiting");
    process.exit(0);
  });

// basic landing page
app.get("/", async (req, res) => {
  res.send("Server is ready to accept requests");
});

// find existing user
io.use(async (socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  console.log(socket.handshake);
  if (sessionID) {
    console.log("SESSION EXISTS");
    // const session = await sessionStore.findSession(sessionID)
    // if (session) {
    //   socket.sessionID = sessionID
    //   socket.userID = session.userID
    //   socket.username = session.username
    //   return next()
    // }
  }
  console.log("SESSION DOES NOT EXIST");
  // const username = socket.handshake.auth.username
  // if (!username) {
  //   return next(new Error("invalid username"))
  // }
  // socket.sessionID = randomId()
  // socket.userID = randomId()
  // socket.username = username
  next();
});

// setup socket.io
io.on("connection", (socket) => {
  console.log("SOCKET LISTENING");

  // if user is already in a game, join it
  if (false) {
    // join the "userID" room
    socket.join(socket.userID);
  }

  socket.on("lobby:join", async (gameId) => {
    try {
      // try to find lobby
      const lobby = await findGameLobby(gameId);
      if (!lobby) {
        throw "error";
      }
      socket.emit("success:lobby_joined", lobby.room);
    } catch (e) {
      socket.emit("error:game_not_found", `${gameId} does not exist`);
    }
  });

  socket.on("game:create", async (timeLimit) => {
    try {
      const room = await createGameLobby(timeLimit);
      socket.emit("success:lobby_joined", room);
    } catch (e) {
      socket.emit("game_create_error", e);
      return;
    }
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    console.log("SOCKET DISCONNECT");
    // const matchingSockets = await io.in(socket.userID).allSockets()
    // const isDisconnected = matchingSockets.size === 0
    // if (isDisconnected) {
    //   // notify other users
    //   socket.broadcast.emit("user disconnected", socket.userID)
    //   // update the connection status of the session
    //   sessionStore.saveSession(socket.sessionID, {
    //     userID: socket.userID,
    //     username: socket.username,
    //     connected: false,
    //   })
    // }
  });
});

httpServer.listen(process.env.PORT);
