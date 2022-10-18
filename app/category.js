import Category from "./models/category";

export const getCategory = async (categoryId) => {
  return await Category.findCategory(categoryId);
};

export const loadCategories = () => {
  return Category.loadCategories();
};
