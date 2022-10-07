import mongoose from "mongoose";
const { Schema } = mongoose;

const PlayerSchema = new Schema({
  lobby: mongoose.ObjectId,
  id: Number,
  name: {
    type: String,
    trim: true,
    required: true,
  },
  isSpectator: Boolean,
  isTurn: Boolean,
  isArtist: Boolean,
  hasVoted: Boolean,
  isReady: Boolean,
  voters: [String],
  createdAt: { type: Date, expires: 3600, default: Date.now },
});

export default mongoose.model("Player", PlayerSchema);
