import randomstring from "randomstring";
import Lobby from "models/lobby.js";

const createGameLobby = () => {
  	const gameKey = randomstring(5)
  	const lobby = new Lobby({
  		room: gameKey,
  		game: {
  			timeLimit: 15,
  			category: 
  		},

  	})
}