import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect } from "./database.js";
import Category from "./models/category.js";
import { getGameLobby, createGameLobby } from "./lobby.js";
import { createPlayer, filterPlayer } from "./player.js";

// setup express
const app = express();
const httpServer = createServer(app);

// setup socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
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
// io.use(async (socket, next) => {
//   const sessionID = socket.handshake.auth.sessionID;
//   if (sessionID) {
//     console.log("SESSION EXISTS");
//     // const session = await sessionStore.findSession(sessionID)
//     // if (session) {
//     //   socket.sessionID = sessionID
//     //   socket.userID = session.userID
//     //   socket.username = session.username
//     //   return next()
//     // }
//   }
//   console.log("SESSION DOES NOT EXIST");
//   // const username = socket.handshake.auth.username
//   // if (!username) {
//   //   return next(new Error("invalid username"))
//   // }
//   // socket.sessionID = randomId()
//   // socket.userID = randomId()
//   // socket.username = username
//   next();
// });

// setup socket.io
io.on("connection", (socket) => {

  socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
  });

  const getCurrentRoom = () => {
    const rooms = Object.keys(socket.rooms);
    return rooms[0];
  }

  const leaveCurrentRoom = () => {
    return socket.leave(getCurrentRoom());
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
      const gameLobby = await getGameLobby(lobbyId);
      // emit joined
      socket.emit("success:lobby_found", gameLobby.room);
    } catch (e) {
      socket.emit("error:lobby_found", `${lobbyId} does not exist`);
    }
  });

  // join lobby
  socket.on("lobby:join", async ({lobby, playerName, isSpectator}) => {
    try {
      // make sure lobby exists
      let gameLobby = await getGameLobby(lobby);
      // if we're already in a lobby, leave it
      if(gameLobby.room && getCurrentRoom()) { leaveCurrentRoom(); }

      // create a new player
      const player = await createPlayer({
        lobby: gameLobby,
        name: playerName,
        spectator: isSpectator
      })

      // add player to game
      gameLobby.players.push(player);
      
      await gameLobby.save();

      // join lobby
      socket.join(gameLobby.room);
      
      // emit joined
      socket.emit("success:lobby_joined", {
        room: gameLobby.room,
        colors: gameLobby.colors,
        players: gameLobby.players.map(p => filterPlayer(p))
      });

      // notify the rest of the room
      socket.to(gameLobby.room).emit("player:added", player);

    } catch (e) {
      console.log(e)
      socket.emit("error:lobby_joined", `${lobby} does not exist`);
    }
  });

  // get available colors
  socket.on("colors:get", async (lobbyId) => {
    try {
      get
      const gameLobby = await getGameLobby(lobbyId);
      // emit joined
      socket.emit("success:colors_get", gameLobby.colors );
    } catch (e) {
      socket.emit("error:colors_get", `${lobbyId} does not exist`);
    }
  });

  // update player's color
  socket.on("colors:update", async (selectedColor) => {
    try {
      const currentLobby = getCurrentRoom();
      const gameLobby = await getGameLobby(currentLobby);
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
