const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports.config = {
    name: "checktn",
    version: "1.0.1",
    hasPermssion: 1,
    credits: "vtishan(Vtuan)",
    description: "Bật/tắt tự động gửi kết quả xổ số",
    commandCategory: "Nhóm",
    usages: "on/off",
    cooldowns: 5,
};

const folder = path.join(__dirname, '/data/LOAD_HISTORY_MESSAGES');
if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

module.exports.run = async function ({ api, event, args }) {
    const senderID = args[1] || (event.type === "message_reply" && event.messageReply ? event.messageReply.senderID : (event.mentions && Object.keys(event.mentions).length > 0) ? Object.keys(event.mentions)[0] : event.senderID);
    const _folder = path.join(folder, event.threadID);
    const filePath = path.join(_folder, `${senderID}.json`);

    if (!fs.existsSync(filePath)) return api.sendMessage(`Không tìm thấy dữ liệu cho senderID: ${senderID}.`, event.threadID);


    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return api.sendMessage(`Dữ liệu bị lỗi hoặc không đọc được.`, event.threadID);
    }

    const _t = data.messages.length;

    if (_t === 0) return api.sendMessage(`Không có tin nhắn nào để hiển thị cho senderID: ${senderID}.`, event.threadID);

    const số_trang = 20;
    const totalPages = Math.ceil(_t / số_trang);
    const page = 1;
    const start = (page - 1) * số_trang;
    const end = start + số_trang;

    const đảo = [...data.messages].reverse();
    const messages = đảo.slice(start, end).map((msg, index) => {
        const number = start + index + 1;
        return `${number}. Nội Dung: ${msg.body || 'Không'}
Time: ${_cvTime(msg.timestamp)}
${msg.attachments.length > 0 ? `Tệp: ` + msg.attachments.map(att => att.type).join(', ') + '\n' : ''}`;
    }).join('\n');

    return api.sendMessage({
        body: `Trang ${page}/${totalPages}:

${messages}

Nhập số từ 1-${totalPages} để chuyển trang hoặc reply "check + số thứ tự" để xem chi tiết tin nhắn.`,
    }, event.threadID, (err, info) => {
        if (err) return;
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            filePath,
            currentPage: page,
            totalPages,
            đảo
        });
    });
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { messageID, author, đảo, totalPages } = handleReply;
    if (event.senderID !== author) return;
    const input = event.body.trim();
    if (/^check\s+\d+$/.test(input)) {
        const index = parseInt(input.split(' ')[1]) - 1;
        if (index < 0 || index >= đảo.length) return api.sendMessage(`Số thứ tự không hợp lệ. Vui lòng chọn số từ 1 đến ${đảo.length}.`, event.threadID);

        const message = đảo[index];
        const att = [];
        const savedFiles = [];

        if (message.attachments && Array.isArray(message.attachments)) {
            for (const att of message.attachments) {
                if (!att.url) continue;

                const _F = (() => {
                    switch (att.type) {
                        case 'photo': return '.jpg';
                        case 'audio': return '.mp3';
                        case 'video': return '.mp4';
                        case 'animated_image': return '.gif';
                        default: return '';
                    }
                })();

                const fileName = `downloaded_file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${_F}`;
                const filePath = path.join(__dirname, fileName);

                try {
                    const response = await axios({
                        method: 'get',
                        url: att.url,
                        responseType: 'stream'
                    });

                    await new Promise((resolve, reject) => {
                        const writeStream = fs.createWriteStream(filePath);
                        response.data.pipe(writeStream);

                        writeStream.on('finish', resolve);
                        writeStream.on('error', reject);
                    });

                    att.push(fs.createReadStream(filePath));
                    savedFiles.push(filePath);
                } catch (error) {
                    console.error('Lỗi tải tệp:', error);
                }
            }
        }

        if (att.length > 0) {
            api.sendMessage({
                body: message.body || 'Không có nội dung',
                attachment: att
            }, event.threadID, () => {
                savedFiles.forEach((filePath) => {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error(`Lỗi khi xóa tệp: ${filePath}`, err);
                    });
                });
            });
        } else {
            api.sendMessage(message.body || 'Không có nội dung', event.threadID);
        }
        return;
    }

    const page = parseInt(input);
    if (isNaN(page) || page < 1 || page > totalPages) return api.sendMessage(`Vui lòng nhập một số hợp lệ từ 1 đến ${totalPages} hoặc reply "check + số thứ tự" để xem chi tiết tin nhắn.`, event.threadID);

    const số_trang = 20;
    const start = (page - 1) * số_trang;
    const end = start + số_trang;

    const messages = đảo.slice(start, end).map((msg, index) => {
        const number = start + index + 1;
        return `${number}. Nội Dung: ${msg.body || 'Không'}
Time: ${_cvTime(msg.timestamp)}
${msg.attachments.length > 0 ? `Tệp: ` + msg.attachments.map(att => att.type).join(', ') + '\n' : ''}`;
    }).join('\n');
    await api.unsendMessage(messageID);
    return api.sendMessage({
        body: `Trang ${page}/${totalPages}:

${messages}

Nhập số từ 1-${totalPages} để chuyển trang hoặc reply "check + số thứ tự" để xem chi tiết tin nhắn.`,
    }, event.threadID, (err, info) => {
        if (err) return;
        handleReply.currentPage = page;
        handleReply.messageID = info.messageID;
    });
};



module.exports.handleEvent = async function ({ api, event, Threads, Users }) {
    const senderID = event.senderID;
    const _folder = path.join(folder, event.threadID);
    const filePath = path.join(_folder, `${senderID}.json`);

    if (!fs.existsSync(_folder)) {
        fs.mkdirSync(_folder, { recursive: true });
    }

    let data = { messages: [] };

    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    const messageData = {
        body: event.body || '',
        timestamp: event.timestamp,
        attachments: (event.attachments || []).map(att => ({ url: att.url, type: att.type }))
    };

    data.messages.push(messageData);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

function _cvTime(t) {
    const d = new Date(+t);
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(d);
}
