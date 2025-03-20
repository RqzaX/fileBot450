module.exports = async function ({ api, models }) {
    const users = require('./../../includes/controllers/users');
    const Users = await users({ api, models });
    const path = require("path");
    const fs = require("fs");
    const moment = require('moment-timezone');
    moment.locale('vi');
    const cacheDir = path.join('./modules/data/checktts');
    const quickSort = (arr, key) => {
        if (arr.length <= 1) return arr;
        const pivot = arr[Math.floor(arr.length / 2)][key];
        const left = arr.filter(item => item[key] > pivot);
        const middle = arr.filter(item => item[key] === pivot);
        const right = arr.filter(item => item[key] < pivot);
        return [...quickSort(left, key), ...middle, ...quickSort(right, key)];
    };
    setInterval(async () => {
        const timeVN = moment().tz('Asia/Ho_Chi_Minh');
        const gio = timeVN.hour();
        const phut = timeVN.minute();
        const giay = timeVN.second();
        const ngayHienTai = timeVN.day();
        fs.readdir(cacheDir, async (err, files) => {
            if (err) return console.error('Lỗi đọc thư mục:', err);
            const threadIDs = files.map(file => path.basename(file, '.json'));
            for (const threadID of threadIDs) {
                const filePath = path.join(cacheDir, `${threadID}.json`);
                const threadData = JSON.parse(fs.readFileSync(filePath));

                const sortedWeek = quickSort(threadData.week, 'count').slice(0, 15);
                const sortedDay = quickSort(threadData.day, 'count').slice(0, 15);

                const sendSortedData = async (sortedData, period) => {
                    let title = period === 'day' ? 'Ngày' : 'Tuần';
                    let message = `📊 Thống kê tương tác ${title} của nhóm:\n`;
                    let b = 1;
                    for (const item of sortedData) {
                        let userName = await Users.getNameUser(item.id);
                        if (!userName) {
                            const userInfo = await api.getUserInfo(item.id);
                            userName = userInfo ? userInfo[item.id].name : null;
                        }
                        message += `${b++} ${userName ? userName : 'FaceBook Users'}: ${item.count}\n`;
                    }
                    let total = sortedData.reduce((acc, item) => acc + item.count, 0);
                    message += `\nTổng số tương tác: ${total}`;
                    try {
                        api.sendMessage(message, threadID);
                    } catch (error) { console.log(error) }
                };

                if (gio === 7 && phut === 59 && giay === 0) {
                    if (ngayHienTai === 1) {
                        await sendSortedData(sortedWeek, 'week');
                    }
                    await sendSortedData(sortedDay, 'day');
                    setTimeout(() => {
                        if (ngayHienTai === 1) {
                            threadData.week.forEach(item => item.count = 0);
                        }
                        threadData.day.forEach(item => item.count = 0);
                        fs.writeFileSync(filePath, JSON.stringify(threadData, null, 2));
                    }, 2 * 1000);
                }
            }
        });
    }, 1000);
}
