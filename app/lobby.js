import randomstring from "randomstring";
import Lobby from "./models/lobby.js";
import Category from "./models/category.js";

export const createGameLobby = async (timeLimit = 0) => {
  const roomId = await Lobby.getUniqueRoomId();
  const category = await Category.findRandomCategory();
  const colors = await Lobby.getColors();
  // create lobby
  const lobby = new Lobby({
    room: roomId,
    game: {
      timeLimit: timeLimit,
      category: category,
    },
    colors: colors.map((c) => ({ color: c[0], disabled: false })),
  });
  // save lobby
  return await lobby.save();
};

export const getGameLobby = async (gameId) => {
  return await Lobby.findRoom(gameId);
};
