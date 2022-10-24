import mongoose from "mongoose";
const { Schema } = mongoose;

const PlayerSchema = new Schema(
  {
    lobby: {
      type: Schema.Types.ObjectId,
    },
    order: {
      type: Number,
      required: false,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    color: String,
    isSpectator: {
      type: Boolean,
      required: false,
      default: false,
    },
    isTurn: {
      type: Boolean,
      required: false,
      default: false,
    },
    hiddenArtist: {
      type: Boolean,
      required: false,
      default: false,
      select: false,
    },
    isReady: {
      type: Boolean,
      required: false,
      default: false,
    },
    vote: {
      type: Schema.Types.ObjectId,
    },
    createdAt: { type: Date, expires: 3600, default: Date.now, select: false },
  },
  {
    statics: {
      async findPlayer(playerId) {
        return await this.findOne({ _id: playerId });
      },
    },
    methods: {
      async isHiddenArtist() {
        const isHiddenArtist = await this.model("Player")
          .findOne(this)
          .select("hiddenArtist");
        return isHiddenArtist.hiddenArtist;
      },
    },
  }
);

export default mongoose.model("Player", PlayerSchema);
