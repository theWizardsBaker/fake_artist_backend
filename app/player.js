import Player from "./models/player.js";

export const createPlayer = async ({ lobby, name, spectator }) => {
  // create player
  const player = new Player({
    lobby: lobby,
    name: name,
    isSpectator: spectator,
  });
  // save lobby
  return await player.save();
};


export const filterPlayer = ({
  name,
  isSpectator,
  isTurn,
  isArtist,
  hasVoted,
  isReady,
  voters 
}) => {
  return {
    name,
    isSpectator,
    isTurn,
    isArtist,
    hasVoted,
    isReady,
    voters
  }
}