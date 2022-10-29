import Lobby from "./models/lobby.js";
import Category from "./models/category.js";
import Drawing from "./models/drawing.js";

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
