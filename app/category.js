import { readCSVFile } from "./utils/readFile.js"
import Category from "./models/category.js"

export const loadCategories = async () => {
	const categoryItems = await readCSVFile("./data/categories.csv");
	const categories = categoryItems.map(c => new Category({ catetory: c[0], subject: c[1] }))
	try {
		// try to bulk insert
		await Category.insertMany(categories)
	} catch(e) {
		console.log(`Could not load categories: \n\t${e}`)
	}
};