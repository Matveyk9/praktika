const express = require("express");
const axios = require("axios");
const cors = require("cors");
const WebSocket = require("ws");
const app = express();
const port = 3000;

// Хранилище ключевых слов и соответствующих URL
const keywords = {
	college: [
		"https://ithub.ru/",
		"https://online.ithub.ru/profday?utm_source=Yandex&utm_medium=5459388686&utm_campaign=112032546&utm_content=16242008512&utm_term=ithub&roistat=direct5_search_16242008512_ithub&roistat_referrer=none&roistat_pos=premium_1&utm_domen=none&utm_position=premium1&utm_region=Москва&utm_device=desktop&utm_tendency=norm&yclid=6256135191151771647",
	],
	википедия: [
		"https://ru.wikipedia.org/wiki/Заглавная_страница",
		"https://ru.wikipedia.org/wiki/Википедия:Форум",
	],
};

app.use(express.json());
// Использование cors для разрешения запросов из других источников
app.use(cors());

// Эндпоинт для получения списка URL по ключевому слову
app.post("/get-urls", (req, res) => {
	const keyword = req.body.keyword;
	const urls = keywords[keyword] || [];
	res.json({ urls });
});

// Эндпоинт для скачивания контента по URL

// app.post("/download", async (req, res) => {
// 	const url = req.body.url;
// 	const totalLength = (await axios.head(url)).headers["content-length"];

// 	axios({
// 		method: "get",
// 		url: url,
// 		responseType: "stream",
// 	})
// 		.then((response) => {
// 			let downloadedLength = 0;
// 			response.data.on("data", (chunk) => {
// 				downloadedLength += chunk.length;
// 				const progress = Math.round(
// 					(downloadedLength / totalLength) * 100
// 				);
// 				res.write(
// 					JSON.stringify({ progress, downloadedLength, totalLength })
// 				);
// 			});

// 			response.data.on("end", () => {
// 				res.end();
// 			});
// 		})
// 		.catch((error) => {
// 			res.status(500).json({ error: "Failed to download content" });
// 		});
// });
const server = app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
	console.log("Client connected");

	ws.on("message", async (message) => {
		const { url } = JSON.parse(message);
		const totalLength = (await axios.head(url)).headers["content-length"];

		axios({
			method: "get",
			url: url,
			responseType: "stream",
		})
			.then((response) => {
				let downloadedLength = 0;
				let dataBuffer = [];
				response.data.on("data", (chunk) => {
					downloadedLength += chunk.length;
					dataBuffer.push(chunk);
					const progress = Math.round(
						(downloadedLength / totalLength) * 100
					);
					ws.send(
						JSON.stringify({
							progress,
							downloadedLength,
							totalLength,
						})
					);
				});

				response.data.on("end", () => {
					const content = Buffer.concat(dataBuffer).toString();

					ws.send(
						JSON.stringify({
							progress: 100,
							downloadedLength,
							totalLength,
							content,
						})
					);
					ws.close();
				});
			})
			.catch((error) => {
				ws.send(
					JSON.stringify({ error: "Failed to download content" })
				);
				ws.close();
			});
	});

	ws.on("close", () => {
		console.log("Client disconnected");
	});
});
