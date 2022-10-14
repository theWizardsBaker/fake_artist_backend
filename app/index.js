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
    return [...socket.rooms][0];
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

      if(!gameLobby) { throw(lobby) }

      // if we're already in a lobby, leave it
      if(gameLobby.room && getCurrentRoom()) { leaveCurrentRoom(); }

      // create a new player
      const player = await createPlayer({
        id: gameLobby.players.length + 1,
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

  // when player leaves
  socket.on("lobby:quit", async () => {
    const room = getCurrentRoom();
    if(room){
      // leave the current room
      leaveCurrentRoom();
      // tell room
      socket.to(room).emit("success:player_quit");
    }
    // tell client
    socket.emit("success:lobby_quit");
  });

  // update player's color
  socket.on("colors:update", async ({newColor, oldColor}) => {
    try {
      const gameLobby = await getGameLobby(getCurrentRoom());
      if(!gameLobby){ throw("Game Lobby not found") }

      let colorAlreadySelected = false;
      // find color
      for(let i = 0; i < gameLobby.colors.length; i++ ) {
        // find the current color
        let c = gameLobby.colors[i];
        console.log(c, gameLobby.colors, gameLobby.colors[0])
        // check the new color pick
        if(c.color === newColor) {
          // make sure this color isn't selected
          if(c.disabled) {
            colorAlreadySelected = true;
            break;
          } else {
            c.disabled = true;
          }
        }
        // enable old color
        if(c.color === oldColor){
          c.disabled = false;
        }
      }

      // if color is found
      if(colorAlreadySelected){
        // send client the updated list of colors
        socket.emit("failed:colors_updated", gameLobby.colors);
        return;
      }

      await gameLobby.save();

      // respond to all users
      io.in(gameLobby.room).emit("success:colors_updated", gameLobby.colors);

    } catch (e) {
      console.log(e)
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
