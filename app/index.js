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

  const getCurrentLobby = () => {
    return Object.keys(socket.rooms())[0];
  }

  const leaveCurrentLobby = () => {
    return socket.leave(getCurrentLobby());
  }

  // create a new lobby
  socket.on("lobby:create", async (timeLimit) => {
    try {
      const gameLobby = await createGameLobby(timeLimit);
      // emit joined
      socket.emit("success:lobby_created", gameLobby.room);
    } catch (e) {
      socket.emit("error:lobby_created", e);
    }
  });

  // find lobby
  socket.on("lobby:find", async (lobbyId) => {
    try {
      // try to find lobby
      const gameLobby = await findGameLobby(lobbyId);
      // emit joined
      socket.emit("success:lobby_found", gameLobby.room);
    } catch (e) {
      socket.emit("error:lobby_found", `${lobbyId} does not exist`);
    }
  });

  // join lobby
  socket.on("lobby:join", async (lobbyId) => {
    try {
      // try to find lobby
      const gameLobby = await findGameLobby(lobbyId);
      // find if we're already in a current lobby, leave it
      if(gameLobby.room && getCurrentLobby()) { leaveCurrentLobby(); }
      // join lobby
      socket.join(gameLobby.room);
      // emit joined
      socket.emit("success:lobby_joined", gameLobby.players);
    } catch (e) {
      socket.emit("error:lobby_joined", `${lobbyId} does not exist`);
    }
  });

  // get available colors
  socket.on("colors:get", async (lobbyId) => {
    try {
      get
      const gameLobby = await findGameLobby(lobbyId);
      // emit joined
      socket.emit("success:colors_get", gameLobby.colors );
    } catch (e) {
      socket.emit("error:colors_get", `${lobbyId} does not exist`);
    }
  });

  // update player's color
  socket.on("colors:update", async (selectedColor) => {
    try {
      const currentLobby = getCurrentLobby();
      const gameLobby = await findGameLobby(currentLobby);
      socket.to(currentLobby).emit("success:colors_updated")
    } catch (e) {
      socket.emit("error:colors_updated", e);
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
