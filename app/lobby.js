import randomstring from "randomstring";
import Lobby from "./models/lobby.js";
import Category from "./models/category.js"

const getColors = async () => {
	const colors = await readCSVFile("./data/colors.csv")
	return categoryItems.map(c => ({ color: c[0], disabled: false }))
}

export const createGameLobby = async () => {
  	const gameKey = randomstring(5)
    const category = await Category.findRandomCategory()
    const colors = await getColors()
  	const lobby = new Lobby({
  		room: gameKey,
  		game: {
  			timeLimit: 15,
  			category: category 
  		},
  		colors: colors,
  		players: []
  	})
}

export const findGameLobby = async (gameId) => {
  	const room = await Lobby.findRoom(gameId)
  	console.log(room)
  	return room
}