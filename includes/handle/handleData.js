module.exports = async (api, models, Users, Threads, Currencies) => {
    try {
        const [threads, users] = await Promise.all([
            Threads.getAll(),
            Users.getAll(['userID', 'name', 'data']),
            Currencies.getAll(['userID'])
        ]);
        threads.forEach(data => {
            global.data.allThreadID.push(String(data.threadID));
            if (data.data && data.data.banned) {
                global.data.threadBanned.set(String(data.threadID), {
                    'reason': data.data.reason || '',
                    'dateAdded': data.data.dateAdded || ''
                });
            }
            if (data.data && data.data.NSFW) {
                global.data.threadAllowNSFW.push(String(data.threadID));
            }
        });
        users.forEach(dataU => {
            global.data.allUserID.push(String(dataU.userID));
            if (dataU.data && dataU.data.banned === true) {
                global.data.userBanned.set(String(dataU.userID), {
                    'reason': dataU.data.reason || '',
                    'dateAdded': dataU.data.dateAdded || ''
                });
            }
        });
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu môi trường:', error);
    }
};