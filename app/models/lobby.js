import mongoose from 'mongoose';
const { Schema } = mongoose;

import Player from './player.js';
import Cateogry from './category.js';

const LobbySchema = new Schema({
	room: {
		type: String,
		trim: true,
		required: true,
		index: {
			unique: true,
		}
	},
	game: {
		timeLimit: Number,
		roundNumber: {
			type: Number,
			required: true,
			default: 0,
			min: 0
		},
		category: {
			type: mongoose.ObjectId,
			required: true,
			ref: Cateogry
		},
	},
	colors: [ { 
		color: String,
		disabled: Boolean
	} ],
	players: [ { 
		type: mongoose.ObjectId,
		ref: Player 
	} ],
	inProgress: {
		type: Boolean,
		default: true
	},
	createdAt: { type: Date, expires: 3600, default: Date.now }
}, {
	statics: {
		async findRoom(roomId) {
			try {
				return await this.findOne({ room: roomId, inProgress: true })
			} catch(e) {
				return null
			}
		}
	}
});

export default mongoose.model('Lobby', LobbySchema);