import { createReadStream } from "fs";
import { parse } from "fast-csv";
import path from "path"

export const readCSVFile = async (file, headers = false) => {
	
	return new Promise(( resolve, reject ) => {
		let data = [];
		const stream = createReadStream(path.resolve(__dirname, '../', file));
		// parse file stream 
		stream.pipe(parse({ 
			headers: headers 
		}))
		.on('error', (e) => {
			reject(`parse error: ${e}`)
		})
		.on('data', (row) => {
			data.push(row)
		})
		.on('end', (rowCount) => {
			resolve(data)
		});
	})

}
