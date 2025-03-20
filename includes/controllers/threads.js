module.exports = function ({ api, event, models}) {
	const Threads = models.use('Threads');

	async function getAll(...data) {
		var where, attributes;
		for (const i of data) {
			if (typeof i != 'object') throw new Error("Cần một đối tượng hoặc mảng.");
			if (Array.isArray(i)) attributes = i;
			else where = i;
		}
		try { 
			return (await Threads.findAll({ where, attributes })).map(e => e.get({ plain: true })); 
		} catch (error) {
			console.error(error);
			throw new Error(error);
		}
	}

	async function getData(threadID) {
		try {
			const data = await Threads.findOne({ where: { threadID }});
			if (data) return data.get({ plain: true });
			else return false;
		} catch (error) { 
			console.error(error);
			throw new Error(error);
		}
	}

	async function getInfo(threadID) {
		try {
			const result = await api.getThreadInfo(threadID);
			return result;
		} catch (error) { 
			console.log(error);
			throw new Error(error);
		}
	}

	async function setData(threadID, options = {}) {
		if (typeof options != 'object' && !Array.isArray(options)) throw new Error("Cần một đối tượng.");
		try {
			(await Threads.findOne({ where: { threadID } })).update(options);
			return true;
		} catch (error) { 
			try {
				await this.createData(threadID, options);
			} catch (error) {
				console.error(error);
				throw new Error(error);
			}
		}
	}

	async function delData(threadID) {
		try {
		  const record = await Threads.findOne({ where: { threadID } });
		  if (!record) {
			console.log(`Không tìm thấy dữ liệu cho threadID: ${threadID}`);
			return false;
		  }
		  await record.destroy();
		  console.log(`Đã xóa dữ liệu cho threadID: ${threadID}`);
		  return true;
		} catch (error) {
		  console.error(`Lỗi khi xóa dữ liệu cho threadID: ${threadID}`, error);
		  throw new Error(`Không thể xóa dữ liệu cho threadID: ${threadID}`);
		}
	  }
	  

	async function createData(threadID, defaults = {}) {
		if (typeof defaults != 'object' && !Array.isArray(defaults)) throw new Error("Cần một đối tượng.");
		try {
			await Threads.findOrCreate({ where: { threadID }, defaults });
			return true;
		} catch (error) {
			console.error(error);
			throw new Error(error);
		}
	}

	return {
		getInfo,
		getAll,
		getData,
		setData,
		delData,
		createData
	};
};
