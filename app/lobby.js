import Lobby from "./models/lobby.js";
import Category from "./models/category.js";
import Drawing from "./models/drawing.js";
import { createPlayer, updatePlayerColor } from "./player.js";

export const createGameLobby = async (rounds = 2, timeLimit = 0) => {
  const roomId = await Lobby.getUniqueRoomId();
  const category = await Category.findRandomCategory();
  const colors = await Lobby.getColors();
  const drawing = await new Drawing();

  await drawing.save();

  // create lobby
  const lobby = new Lobby({
    room: roomId,
    game: {
      maxRounds: rounds,
      timeLimit: timeLimit,
      category: category,
      drawing: drawing,
    },
    colors: colors.map((c) => ({ color: c[0], disabled: false })),
  });
  // save lobby
  return await lobby.save();
};

export const getGameLobby = async (gameId, open) => {
  return await Lobby.findRoom(gameId.toUpperCase(), open);
};

export const deleteGameLobby = async (gameLobby) => {
  return await Lobby.deleteOne(gameLobby);
};

export const lobbySocket = (io, socket) => {
  // create a new lobby
  socket.on("lobby:create", async ({ maxRounds, timeLimit }) => {
    try {
      const gameLobby = await createGameLobby(maxRounds, timeLimit);
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
        await deleteGameLobby(gameLobby);
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
      if (await getPlayerByColor(gameLobby, selectedColor)) {
        throw "color in use";
      }
      // update player's color
      let player = await getPlayerById(playerId);
      player = await updatePlayerColor(player, selectedColor);
      // respond to all users
      io.in(socket.getCurrentRoom()).emit("success:colors_updated", player);
    } catch (e) {
      socket.emit("error:colors_updated", e);
    }
  });
};
