import mongoose from "mongoose";
import { readCSVFile } from "../utils/readFile.js";
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    category: String,
    subject: String,
  },
  {
    statics: {
      async findRandomCategory() {
        try {
          // Get the count of all users
          const count = await this.count();
          // Get a random number
          const random = Math.floor(Math.random() * count);
          // find random category
          return await this.findOne().skip(random);
        } catch (e) {
          return new Error(`unable to find Random Category:\n\t${e}`);
        }
      },

      async loadCategories() {
        console.log("reading categories");
        const categoryItems = await readCSVFile("./data/categories.csv");
        const categories = categoryItems.map(
          (c) => new this({ category: c[0], subject: c[1] })
        );
        try {
          // remove existing categories
          await this.deleteMany({});
          console.log("remove existing categories");
          // replace existing
          await this.insertMany(categories);
          console.log("seed new categories");
        } catch (e) {
          console.log(`Could not load categories: \n\t${e}`);
        }
      },

      async findCategory(categoryId) {
        return await this.findOne(categoryId);
      },
    },
  }
);

export default mongoose.model("Category", CategorySchema);
