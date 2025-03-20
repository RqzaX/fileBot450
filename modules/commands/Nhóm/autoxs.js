module.exports.config = {
    name: "autoxs",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "vtishan(Vtuan)",
    description: "Bật/tắt tự động gửi kết quả xổ số",
    commandCategory: "Nhóm",
    usages: "on/off",
    cooldowns: 5,
};
const fs = require("fs-extra");
const moment = require('moment-timezone');
const axios = require('axios');
const cheerio = require('cheerio');

const folder = __dirname + '/data/auto_xổ_số.json';

if (!fs.existsSync(folder)) fs.writeFileSync(folder, JSON.stringify([]));

module.exports.onLoad = async function (api) {
    setInterval(async () => {
        const timeVN = moment().tz('Asia/Ho_Chi_Minh');
        const gio = timeVN.hour();
        const phut = timeVN.minute();
        const giay = timeVN.second();

        if (gio === 18 && phut === 32 & giay === 0) {
            const { data } = await xsmb();
            const _fd = data[Object.keys(data)[0]];
            let message = `Kết quả xổ số Miền Bắc ngày: ${Object.keys(data)[0]}\n\n` +
                `Mã ĐB: ${_fd['Mã ĐB'][0].split('-').map(item => item.trim()).join(' - ')}\n` +
                `Giải ĐB: ${_fd['ĐB'].join(', ')}\nGiải Nhất: ${_fd['G.1'].join(', ')}\n` +
                `Giải Nhì: ${_fd['G.2'].join(', ')}\nGiải Ba: ${_fd['G.3'].join(', ')}\n` +
                `Giải 4: ${_fd['G.4'].join(', ')}\nGiải 5: ${_fd['G.5'].join(', ')}\n` +
                `Giải 6: ${_fd['G.6'].join(', ')}\nGiải 7: ${_fd['G.7'].join(', ')}\n\n` +
                `Thả cảm xúc vào tin nhắn này để xem xổ số miền nam\n`;

            let _r = JSON.parse(fs.readFileSync(folder, 'utf8'));
            if (global.data?.allThreadID) {
                global.data.allThreadID.forEach(id => {
                    if (!_r.includes(id)) {
                        api.sendMessage(message, id, (_, info) => {
                            global.client.handleReaction.push({ name: module.exports.config.name, messageID: info?.messageID });
                        });
                    }
                });
            }
        }
    }, 1000);
};

module.exports.run = async ({ api, event }) => {
    const { threadID } = event;
    let data = JSON.parse(fs.readFileSync(folder, 'utf8'));
    const action = data.includes(threadID) ? 'bật' : 'tắt';
    fs.writeFileSync(folder, JSON.stringify(data.includes(threadID) ? data.filter(id => id !== threadID) : [...data, threadID]));
    api.sendMessage(`Đã ${action} tự động gửi kết quả xổ số cho nhóm này.`, threadID);
};

module.exports.handleReaction = async function ({ api, event }) {
    const data = await xsmn();
    let message = data.map(province => {
        return `Kết quả xổ số tỉnh ${province.name}:\n` +
            Object.entries({
                'ĐB': 'Giải Đặc Biệt',
                'G1': 'Giải Nhất',
                'G2': 'Giải Nhì',
                'G3': 'Giải Ba',
                'G4': 'Giải 4',
                'G5': 'Giải 5',
                'G6': 'Giải 6',
                'G7': 'Giải 7',
                'G8': 'Giải 8'
            }).map(([key, label]) => {
                const result = province.results.find(res => res['giải'] === key);
                return result ? `${label}: ${result['kết_quả'].join(', ')}` : '';
            }).join('\n') + '\n';
    }).join('\n');

    api.sendMessage(message, event.threadID);
};

async function xsmn() {
    const url = 'https://xsmn.mobi/';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const _con = $('#load_kq_mn_0');
    const Names = [];
    const data = [];
    const headerRow = _con.find('table.extendable tbody tr.gr-yellow');
    headerRow.find('th').each((_, th) => {
        const provinceName = $(th).text().trim();
        if (provinceName && provinceName !== '') Names.push(provinceName);
    });
    _con.find('table.extendable tbody tr').each((_, row) => {
        const giải = $(row).find('td:first').text().trim();
        const provinces = [];
        if (giải) {
            $(row).find('td').each((_, td) => {
                const result = $(td).text().trim();
                if (result && result !== giải) provinces.push(result);
            });
            if (provinces.length > 0) data.push({ giải, provinces });
        }
    });

    const _kq = Names.map((i) => {
        const _data = data.map((item) => {
            const kqua = item.provinces[Names.indexOf(i)];
            const _split = [];
            const chunkMap = { 'ĐB': 6, 'G1': 5, 'G2': 5, 'G3': 5, 'G4': 5, 'G5': 4, 'G6': 4, 'G7': 3, 'G8': 2 };
            let chunkSize = chunkMap[item.giải];
            chunkSize && (item.giải === 'G3' ? (_split.push(kqua.slice(0, chunkSize)), _split.push(kqua.slice(chunkSize, chunkSize * 2))) : item.giải === 'G6' ? (_split.push(kqua.slice(0, chunkSize)), _split.push(kqua.slice(chunkSize, chunkSize * 2)), _split.push(kqua.slice(chunkSize * 2, chunkSize * 3))) : item.giải === 'G4' ? [...Array(7)].forEach((_, i) => _split.push(kqua.slice(i * chunkSize, (i + 1) * chunkSize))) : _split.push(kqua.slice(0, chunkSize))
            );
            return { giải: item.giải, kết_quả: _split, };
        });
        return { name: i, results: _data, };
    });
    return _kq;
}

async function xsmb() {
    try {
        const url = 'https://xsmn.mobi/xsmb-xo-so-mien-bac.html';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const dateText = $('div.title-bor a[title^="XSMB ngày"]').attr('title');
        let date = dateText ? dateText.replace('XSMB ngày ', '').trim() : 'Không tìm thấy ngày';
        const luyNgay = (dateString) => {
            const date = new Date(dateString.split('-').reverse().join('-'));
            date.setDate(date.getDate() - 1); // Lùi 1 ngày
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        };
        const data = {};
        const rows = $('table.kqmb tbody tr');
        let results = [];
        rows.each((index, element) => {
            const giai = $(element).find('td.txt-giai').text().trim();
            const num = $(element).find('td.v-giai span').map((i, el) => $(el).text().trim()).get();
            if (giai && num.length > 0) results.push({ giai, num });
            if (giai === 'G.7') {
                data[date] = results.reduce((acc, { giai, num }) => {
                    if (!acc[giai]) acc[giai] = [];
                    acc[giai] = [...acc[giai], ...num];
                    return acc;
                }, {});
                date = luyNgay(date);
                results = [];
            }
        });
        if (results.length > 0) {
            data[date] = results.reduce((acc, { giai, num }) => {
                if (!acc[giai]) acc[giai] = [];
                acc[giai] = [...acc[giai], ...num];
                return acc;
            }, {});
        }
        return { data };
    } catch (error) {
        console.error("Đã xảy ra lỗi khi lấy dữ liệu: ", error.message);
        return { date: 'Không tìm thấy ngày', data: {} };
    }
}