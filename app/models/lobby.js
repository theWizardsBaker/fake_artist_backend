import mongoose from "mongoose";
const { Schema } = mongoose;

import randomstring from "randomstring";
import { readCSVFile } from "../utils/readFile.js";

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
          .generate({ length: 5, readable: true })
          .toUpperCase();
        // check that the room does not already exist
        if (await this.exists({ room: roomId })) {
          // keep trying to find a unique key (should almost never happen)
          return this.getUniqueRoomId();
        } else {
          return roomId;
        }
      },

      async getColors() {
        return await readCSVFile("./data/colors.csv");
      },
    },
  }
);

export default mongoose.model("Lobby", LobbySchema);
