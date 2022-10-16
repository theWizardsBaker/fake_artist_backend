import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect } from "./database.js";
import Category from "./models/category.js";
import { getGameLobby, createGameLobby } from "./lobby.js";
import {
  createPlayer,
  getPlayer,
  updatePlayerColor,
  findPlayerByColor,
  updatePlayerReady,
} from "./player.js";

// setup express
const app = express();
const httpServer = createServer(app);

// setup socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
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

io.use((socket, next) => {
  socket.getCurrentRoom = () => {
    return [...socket.rooms][0];
  };

  socket.leaveCurrentRoom = () => {
    return socket.leave(socket.getCurrentRoom());
  };

  // check if in room
  // check that game exists

  next();
});

// setup socket.io
io.on("connection", (socket) => {
  socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
  });

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
  socket.on("lobby:join", async ({ lobby, playerName, isSpectator }) => {
    try {
      // make sure lobby exists
      let gameLobby = await getGameLobby(lobby);

      if (!gameLobby) {
        throw lobby;
      }

      // if we're already in a lobby, leave it
      if (gameLobby.room && socket.getCurrentRoom()) {
        socket.leaveCurrentRoom();
      }

      // create a new player
      const player = await createPlayer({
        turnOrder: gameLobby.players.length + 1,
        lobby: gameLobby,
        name: playerName,
        spectator: isSpectator,
      });

      // add player to game
      gameLobby.players.push(player);

      // save player to socket instance
      socket.playerId = player._id;

      await gameLobby.save();

      // emit joined
      socket.emit("success:lobby_joined", { gameLobby, playerId: player._id });
      // notify the rest of the room
      socket.to(gameLobby.room).emit("success:player_joined", player);

      // join lobby
      socket.join(gameLobby.room);
    } catch (e) {
      console.log(e);
      socket.emit("error:lobby_joined", `${lobby} does not exist`);
    }
  });

  // when player leaves
  socket.on("lobby:quit", async () => {
    const room = socket.getCurrentRoom();
    if (room) {
      // leave the current room
      socket.leaveCurrentRoom();
      // tell room
      socket.to(room).emit("success:player_quit");
    }
    // tell client
    socket.emit("success:lobby_quit");
  });

  // update player's color
  socket.on("player:update", async (selectedColor) => {
    try {
      // update player's color
      const player = await updatePlayerReady(socket.playerId);
      // respond to all users
      io.in(socket.getCurrentRoom()).emit("success:player_updated", player);
      // check game start:

      // // check if all players are ready
      // const gameLobby = await getGameLobby(socket.getCurrentRoom());
      // const allPlayersAreReady = gameLobby.players.reduce((p) => p.isReady, true);
      // // is all players are ready
      // if(allPlayersAreReady){
      //   // close game lobby to new players
      //   gameLobby.open = false;
      //   // make sure all players have a color
      //   gameLobby.players.forEach((p) => {
      //     if(!p.color){

      //     }
      //   })

      //   await gameLobby.save();

      // notify game start
      // socket.emit("success:start_game");
      // }
    } catch (e) {
      socket.emit("error:colors_updated", e);
    }
  });

  // update player's color
  socket.on("colors:update", async (selectedColor) => {
    try {
      // find lobby
      const gameLobby = await getGameLobby(socket.getCurrentRoom());
      // make sure this color is not already selected
      if (await findPlayerByColor(gameLobby, selectedColor)) {
        throw "color in use";
      }
      // update player's color
      const player = await updatePlayerColor(socket.playerId, selectedColor);
      // respond to all users
      io.in(socket.getCurrentRoom()).emit("success:colors_updated", player);
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
