import mongoose from "mongoose";
const { Schema } = mongoose;

import randomstring from "randomstring";
import { readCSVFile } from "../utils/readFile.js";

import Player from "./player.js";
import Drawing from "./drawing.js";

const LobbySchema = new Schema(
  {
    room: {
      type: String,
      trim: true,
      required: true,
      index: {
        unique: true,
      },
    },
    game: {
      timeLimit: Number,
      roundNumber: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      maxRounds: {
        type: Number,
        required: false,
        default: 2,
      },
      turnNumber: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      category: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Cateogry",
      },
      inProgress: {
        type: Boolean,
        default: false,
      },
      drawing: {
        type: Schema.Types.ObjectId,
        ref: "Drawing",
      },
    },
    colors: [
      {
        color: String,
        disabled: Boolean,
      },
    ],
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
      },
    ],
    open: {
      type: Boolean,
      default: true,
    },
    createdAt: { type: Date, expires: 3600, default: Date.now, select: false },
  },
  {
    statics: {
      async findRoom(roomId, isOpen = null) {
        let params = { room: roomId };
        if (isOpen != null) {
          params.open = isOpen;
        }
        return await this.findOne(params).populate("players");
      },

      async getUniqueRoomId() {
        const roomId = randomstring
          .generate({
            length: 5,
            readable: true,
            capitalization: 'uppercase'
          })
          .replace(/[L|I]/g, "1")
        // check that the room does not already exist
        if (await this.exists({ room: roomId })) {
          // keep trying to find a unique key (should never happen)
          return this.getUniqueRoomId();
        } else {
          return roomId;
        }
      },

      async getColors() {
        return await readCSVFile("./data/colors.csv");
      },
    },
    methods: {
      async getDrawings() {
        const allDrawings = await this.model("Lobby")
          .findOne(this)
          .populate("game.drawing");
        return allDrawings.game.drawing;
      },
    },
  }
);

LobbySchema.pre("deleteOne", { document: true }, () => {
  Player.deleteMany({ lobby: this._id }).exec();
  Drawing.deleteOne(this.game.drawing).exec();
});

export default mongoose.model("Lobby", LobbySchema);
