import mongoose from 'mongoose';
const { Schema } = mongoose

const CategorySchema = new Schema({
	category: String,
	subject: String,
	likeCount: {
		type: Number,
		default: 0
	},
	dislikeCount: {
		type: Number,
		default: 0
	}
});

export default mongoose.model('Category', CategorySchema);