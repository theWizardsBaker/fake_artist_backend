import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect } from "./database.js";
import { loadCategories, getCategory } from "./category.js";
import { getGameLobby, createGameLobby, deleteGameLobby } from "./lobby.js";
import {
  createPlayer,
  getPlayerById,
  updatePlayerColor,
  findPlayerByColor,
  deletePlayer,
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
  .then(() => loadCategories())
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
      await socket.join(gameLobby.room);
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
        // remove the default room
        socket.leaveCurrentRoom();
        await socket.join(gameLobby.room);
        // notify game
        if (gameLobby.game.inProgress) {
          socket.emit("success:lobby_rejoin_game", gameLobby.game);
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
      // pick a hidden artist
      let hiddenArtist =
        gameLobby.players[Math.floor(Math.random() * gameLobby.players.length)];

      hiddenArtist.hiddenArtist = true;

      await hiddenArtist.save();

      await gameLobby.save();

      // colors
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
      io.in(socket.getCurrentRoom()).emit("success:game_started", {
        players: gameLobby.players.length,
        timeLimit: gameLobby.game.timeLimit,
        maxRounds: gameLobby.game.maxRounds,
      });
    } catch (e) {
      console.log(e);
      socket.emit("error:game_start", e);
    }
  });

  // quit game
  socket.on("game:quit", async () => {
    try {
      // cleanup
      const room = socket.getCurrentRoom();
      const gameLobby = await getGameLobby(room);
      // remove lobby and be extention game and players
      await deleteLobby(gameLobby);
      // notify room
      socket.to(room).emit("success:game_quit");
      // force all users to leave room
      io.sockets.clients(room).forEach((player) => {
        player.leave(room);
      });
    } catch (e) {
      console.log(e);
    }
  });

  // get turn
  socket.on("game:get_turn", async () => {
    try {
      const gameLobby = await getGameLobby(socket.getCurrentRoom(), false);
      socket.emit("success:game_turn", gameLobby.game.turnNumber);
    } catch (e) {
      console.log("GAME TURN", e);
    }
  });

  // get turn
  socket.on("game:get_topic", async (playerId) => {
    try {
      const player = await getPlayerById(playerId);
      const gameLobby = await getGameLobby(socket.getCurrentRoom(), false);
      const category = await getCategory(gameLobby.game.category);
      // remove the subject if the player is the hidden artist
      const subject = (await player.isHiddenArtist())
        ? "???"
        : category.subject;
      socket.emit("success:game_topic", subject);
    } catch (e) {
      console.log("GAME TOPIC ERROR", e);
    }
  });

  // get drawings
  socket.on("game:get_all_drawings", async (paths) => {
    try {
      const gameLobby = await getGameLobby(socket.getCurrentRoom(), false);
      // get all drawings
      const drawings = await gameLobby.getDrawings();
      console.log(gameLobby, drawings);
      if (paths) {
        const lastNDrawings = paths - drawings.length;
        // send any missing drawings back to
        socket.emit(
          "success:get_all_drawings",
          drawings.paths.slice(lastNDrawings)
        );
      } else {
        socket.emit("success:get_all_drawings", drawings.paths);
      }
    } catch (e) {
      console.log(e);
    }
  });

  // set drawing
  socket.on("game:set_drawing", async (newPath) => {
    try {
      const gameLobby = await getGameLobby(socket.getCurrentRoom(), false);
      const drawings = await gameLobby.getDrawings();
      // add new path
      drawings.paths.push(newPath);
      // save drawing
      await drawings.save();
      // increment the turn
      gameLobby.game.turnNumber += 1;
      // increment the round if the turn counter
      // has rolled over
      if (gameLobby.game.turnNumber >= gameLobby.players.length) {
        gameLobby.game.turnNumber = 0;
        gameLobby.game.roundNumber += 1;
      }
      gameLobby.save();
      // notify the room
      socket.to(gameLobby.room).emit("success:set_drawing", newPath);
    } catch (e) {
      console.log(e);
      socket.emit("error:set_drawing");
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
