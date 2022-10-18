import Player from "./models/player.js";

export const createPlayer = async ({ lobby, name, spectator, turnOrder }) => {
  // create player
  const player = new Player({
    order: turnOrder,
    lobby: lobby,
    name: name,
    isSpectator: spectator,
  });
  // save lobby
  return await player.save();
};

export const getPlayerById = async (playerId) => {
  return await Player.findPlayer(playerId);
};

export const findPlayerByColor = async (lobby, color) => {
  console.log(lobby, color);
  return await Player.findOne({ lobby: lobby, color: color });
};

export const updatePlayerColor = async (playerId, color) => {
  return await Player.findOneAndUpdate(
    { _id: playerId },
    { color: color },
    { new: true }
  );
};

export const deletePlayer = async (playerId) => {
  return await Player.deleteOne({ _id: playerId });
};
