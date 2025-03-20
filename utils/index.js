const axios = require('axios');
const got = require('got')
module.exports.downloadFile = async function (url, path) {
	const { createWriteStream } = require('fs');

	const response = await axios({
		method: 'GET',
		responseType: 'stream',
		url
	});

	const writer = createWriteStream(path);

	response.data.pipe(writer);

	return new Promise((resolve, reject) => {
		writer.on('finish', resolve);
		writer.on('error', reject);
	});
};

module.exports.getUID = async function (url) {
	try {
		if (url.match("profile.php") !== null) {
			if (url.match("&mi") !== null) return url.split("php?id=")[1].split("&")[0];
			return url.split("php?id=")[1];
		}
		var getUID = await getUIDFast(url);
		if (!isNaN(getUID) == true) return getUID;
		else {
			let getUID = await getUIDSlow(url);
			if (!isNaN(getUID)) return getUID;
			else return null;
		}
	} catch (e) { return console.log(e); };
}
async function getUIDFast(url) {
	var FormData = require("form-data");
	var Form = new FormData();
	var Url = new URL(url);
	Form.append('link', Url.href);
	try {
		var data = await got.post('https://id.traodoisub.com/api.php', {
			body: Form
		})
	} catch (e) {
		return console.log("Lỗi: " + e.message);
	}
	if (JSON.parse(data.body.toString()).error) return console.log(JSON.parse(data.body.toString()).error);
	else return JSON.parse(data.body.toString()).id || "co cai nit huhu";
}

async function getUIDSlow(url) {
	var FormData = require("form-data");
	var Form = new FormData();
	var Url = new URL(url);
	const username = Url.pathname.replace(/\//g, "")
	Form.append('username', username);
	try {
		var data = await axios({
			method: "POST",
			url: 'https://api.findids.net/api/get-uid-from-username',
			data: {
				username
			}
		})
		return data.data.data.id
	} catch (e) {
		console.log(e)
		return "errr"
	}
}

