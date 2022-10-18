import Drawing from "./models/drawing";

export const getDrawing = async (drawingId) => {
  return await Drawing.find()
};