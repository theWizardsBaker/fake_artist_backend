import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect } from "./database.js";
import Category from "./models/category.js";
import { getGameLobby, createGameLobby, deleteGameLobby } from "./lobby.js";
import {
  createPlayer,
  getPlayer,
  updatePlayerColor,
  findPlayerByColor,
  deletePlayer,
} from "./player.js";

const MAX_PLAYERS = 12;

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
      const gameLobby = await getGameLobby(lobbyId, true);
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
      let gameLobby = await getGameLobby(lobby, true);

      if (!gameLobby) {
        throw lobby;
      }

      // if we're already in a lobby, leave it
      if (socket.getCurrentRoom()) {
        socket.leaveCurrentRoom();
      }

      let order = 0;
      // find the greatest turn order
      if (gameLobby.players.length > 0) {
        order = Math.max(...gameLobby.players.map((p) => p.order));
        // and add one
        order++;
      }

      // create a new player
      const player = await createPlayer({
        turnOrder: order,
        lobby: gameLobby,
        name: playerName,
        spectator: isSpectator,
      });

      // add player to game
      gameLobby.players.push(player);

      // if the game lobby is full
      if (gameLobby.players.length === gameLobby.colors.length) {
        // close the game lobby for new players
        gameLobby.open = false;
      }

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

  // rejoin
  socket.on("lobby:rejoin", async (room) => {
    try {
      // find lobby
      const gameLobby = await getGameLobby(room);
      // if the user is in a lobby
      // send the right signal
      if (gameLobby) {
        socket.join(gameLobby.room);
        // remove the default room
        socket.leaveCurrentRoom();
        // notify game
        if (gameLobby.game.inProgress) {
          socket.emit("success:lobby_rejoin_game");
        } else {
          socket.emit("success:lobby_rejoin_lobby");
        }
      } else {
        throw "";
      }
    } catch (e) {
      socket.emit("error:lobby_rejoin");
    }
  });

  // when player leaves
  socket.on("lobby:quit", async (playerId) => {
    try {
      // tell client to quit
      socket.emit("success:lobby_quit");
      // delete player
      await deletePlayer(playerId);

      const room = socket.getCurrentRoom();
      // notify room
      socket.to(room).emit("success:player_quit", playerId);
      // leave the current room
      socket.leaveCurrentRoom();

      // cleanup
      const gameLobby = await getGameLobby(room);

      if (gameLobby && !gameLobby.players.length) {
        deleteGameLobby(gameLobby);
      }
    } catch (e) {
      console.log(e);
      socket.emit("success:lobby_quit");
    }
  });

  // update player's color
  socket.on("colors:update", async (playerId, selectedColor) => {
    try {
      // find lobby
      const gameLobby = await getGameLobby(socket.getCurrentRoom());
      // make sure this color is not already selected
      if (await findPlayerByColor(gameLobby, selectedColor)) {
        throw "color in use";
      }
      // update player's color
      const player = await updatePlayerColor(playerId, selectedColor);
      // respond to all users
      io.in(socket.getCurrentRoom()).emit("success:colors_updated", player);
    } catch (e) {
      socket.emit("error:colors_updated", e);
    }
  });

  // start game
  socket.on("game:start", async () => {
    try {
      // find lobby
      const gameLobby = await getGameLobby(socket.getCurrentRoom());
      // close the game lobby for new players
      gameLobby.open = false;
      // mark the game as inProgress
      gameLobby.game.inProgress = true;

      await gameLobby.save();

      // assign colors to any player who hasn't selected one
      const playersWithoutColors = gameLobby.players.filter((p) => !p.color);

      if (playersWithoutColors.length) {
        // find all colors
        const usedColors = [];
        // filter out used colors
        gameLobby.players.forEach((p) => {
          if (p.color) {
            usedColors.push(p.color);
          }
        });
        // get available colors
        const availableColors = gameLobby.colors.filter(
          (c) => !usedColors.includes(c.color)
        );
        // assign colors to users without colors
        await Promise.all(
          playersWithoutColors.map((player) => {
            player.color = availableColors.pop().color;
            return player.save();
          })
        );
        const updatedGameLobby = await getGameLobby(socket.getCurrentRoom());
        io.in(socket.getCurrentRoom()).emit(
          "success:players_updated",
          updatedGameLobby.players
        );
      }

      // respond to all users
      io.in(socket.getCurrentRoom()).emit("success:game_started");
    } catch (e) {
      console.log(e);
      socket.emit("error:game_start", e);
    }
  });

  // get turn
  socket.on("game:get_turn", async () => {
    try {
      const gameLobby = await getGameLobby(socket.getCurrentRoom(), false);
      socket.emit("success:game_turn", gameLobby.game.turnNumber);
    } catch (e) {
      console.log("TURN NUMBER ERROR", e);
    }
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    console.log("SOCKET DISCONNECT");

    // if a player leaves do a re-order

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
