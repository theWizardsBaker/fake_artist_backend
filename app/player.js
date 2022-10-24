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

export const getAllPlayers = async (lobby) => {
  if (lobby) {
    return await Player.find({ lobby: lobby });
  } else {
    return await Player.find();
  }
};

export const getPlayerById = async (playerId) => {
  return await Player.findPlayer(playerId);
};

export const getPlayerByColor = async (lobby, color) => {
  return await Player.findOne({ lobby: lobby, color: color });
};

export const getHiddenArtist = async (lobby) => {
  return await Player.findOne({
    lobby: lobby,
    hiddenArtist: true,
  });
};

export const updatePlayerColor = async (player, color) => {
  return await Player.findOneAndUpdate(
    { _id: player },
    { color: color },
    { new: true }
  );
};

export const updatePlayerVote = async (player, votePlayerId) => {
  return await Player.findOneAndUpdate(
    { _id: player },
    { vote: votePlayerId },
    { new: true }
  );
};

export const deletePlayer = async (playerId) => {
  return await Player.deleteOne({ _id: playerId });
};
