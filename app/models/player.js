import mongoose from "mongoose";
const { Schema } = mongoose;

const PlayerSchema = new Schema(
{
  lobby: {
    type: Schema.ObjectId,
    ref: 'Player'
  },
  id: {
    type: Number,
    required: false
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  isSpectator: {
    type: Boolean,
    required: false,
    default: false
  },
  isTurn: {
    type: Boolean,
    required: false,
    default: false
  },
  isArtist: {
    type: Boolean,
    required: false,
    default: false
  },
  hasVoted: {
    type: Boolean,
    required: false,
    default: false
  },
  isReady: {
    type: Boolean,
    required: false,
    default: false
  },
  voters: [String],
  createdAt: { type: Date, expires: 3600, default: Date.now },
},
{
  statics: {

  }
}
);

export default mongoose.model("Player", PlayerSchema);
