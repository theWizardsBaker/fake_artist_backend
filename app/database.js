import mongoose from "mongoose";

const server = "mongo";
const port = "27017";
const database = process.env.DATABASE;

export const connect = () => {
  return new Promise(async (resolve, reject) => {
    try {
      mongoose.set("debug", (collectionName, method, query, doc) => {
        console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
      });
      await mongoose.connect(`mongodb://${server}:${port}/${database}`, {
        user: process.env.USERNAME,
        pass: process.env.PASSWORD,
        authSource: "admin",
      });
      console.log("MongoDB is connected!!");
      resolve();
    } catch (e) {
      console.log("MongoDB connection unsuccessful", e);
      reject();
    }
  });
};
