import mongoose from "mongoose";

// process.env.MONGODB_URI
const server = 'mongo';
const port = '27017';
const database = 'fake-artist';

export const connect = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await mongoose.connect(`mongodb://${server}:${port}/${database}`, {
        user: "root",
        pass: "example",
        authSource: 'admin'
      });
      console.log("MongoDB is connected!!");
      resolve()
    } catch(e) {
      console.log("MongoDB connection unsuccessful", e);
      reject()
    }
  })
};