import mongoose from "mongoose";
const { Schema } = mongoose;

const DrawingSchema = new Schema(
  {
    paths: {
      type: Array,
      default: [],
      required: true
    },
    createdAt: { type: Date, expires: 3600, default: Date.now, select: false },
  },
);

export default mongoose.model("Drawing", DrawingSchema);
