import { getGameLobby, deleteGameLobby } from "./lobby.js";
import { getCategory } from "./category.js";
import {
  getPlayerById,
  updatePlayerVote,
  getHiddenArtist,
  getAllPlayers,
} from "./player.js";

export const gameSocket = (io, socket) => {
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
      // notify room
      io.in(room).emit("success:game_quit");
      // remove lobby and be extention game and players
      await deleteGameLobby(gameLobby);
      // force all users to leave room
      // io.sockets.clients(room).forEach((player) => {
      //   player.leave(room);
      // });
    } catch (e) {
      console.log("QUIT GAME ERROR ", e);
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

  // cast vote
  socket.on("game:vote", async (playerId, voteForId) => {
    try {
      let player = await getPlayerById(playerId);
      // update vote
      player = await updatePlayerVote(player, voteForId);
      // notify sender
      socket.emit("success:voted", voteForId);
    } catch (e) {
      console.log(e);
      socket.emit("error:voted");
    }
  });

  // check vote
  socket.on("game:voted", async (playerId) => {
    try {
      const player = await getPlayerById(playerId);
      console.log("PLAYER HS VOTED", player, !!player.vote);
      if (!!player.vote) {
        // notify sender
        socket.emit("success:voted", player.vote);
      }
    } catch (e) {
      console.log("VOTE ERROR", e);
    }
  });

  // check voting
  socket.on("game:voting", async () => {
    try {
      // check if all players have voted
      const gameLobby = await getGameLobby(socket.getCurrentRoom(), false);
      const allVotes = await getAllPlayers(gameLobby);

      // if all players have voted, notify lobby
      if (gameLobby.players.length === allVotes.filter((p) => p.vote).length) {
        // get the hidden artist
        const hiddenArtist = await getHiddenArtist(gameLobby);
        // list of votes by player
        let votesByPlayer = {};
        // each voter
        await allVotes.forEach(async (p) => {
          // create array of players who voted for another player
          (votesByPlayer[p.vote] || (votesByPlayer[p.vote] = [])).push(p._id);
        });
        // notify room
        socket.to(gameLobby.room).emit("success:voting_complete", {
          hiddenArtist: hiddenArtist._id,
          votes: votesByPlayer,
        });
      }
    } catch (e) {
      console.log("VOTE ERROR", e);
    }
  });
};
