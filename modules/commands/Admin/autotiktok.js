const axios = require('axios');
const fs = require('fs');
const path = require('path');

const isUrl = url => /^http(s|):\/\//.test(url);

const streamUrl = async (url, type) => {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const filePath = path.join(__dirname, 'cache', `${Date.now()}.${type}`);
    fs.writeFileSync(filePath, res.data);
    setTimeout(() => fs.unlinkSync(filePath), 1000 * 60);
    return fs.createReadStream(filePath);
  } catch (error) {
    console.error('Error streaming URL:', error);
  }
};

exports.config = {
  name: 'autotiktok',
  version: '0.0.1',
  hasPermssion: 0,
  Rent: 2,
  credits: 'DC-Nam',
  description: '.',
  commandCategory: 'Admin',
  usages: 'autodowntiktok',
  cooldowns: 0
};

exports.run = function(o) {};

exports.handleEvent = async function(o) {
  try {
    const args = o.event.body;
    if (!args) return;

    const send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);

    const words = args.split(' ');
    const tiktokRegex = /(?:https:\/\/(?:www\.)?tiktok\.com\/(?:@[\w\d.]+\/(?:video|photo)\/(\d+))|(https:\/\/(?:vt|vm)\.tiktok\.com\/[\w\d]+))/;
    const tiktokUrl = words.find(word => tiktokRegex.test(word));

    if (tiktokUrl) {
      // console.log(`link toptop: ${tiktokUrl}`);
      
      const res = await axios.post('https://www.tikwm.com/api/', { url: tiktokUrl });
      if (res.data.code !== 0) throw res;

      const tiktok = res.data.data;
      const attachment = [];

      if (Array.isArray(tiktok.images)) {
        for (const imageUrl of tiktok.images) {
          attachment.push(await streamUrl(imageUrl, 'jpg'));
        }
      } else {
        attachment.push(await streamUrl(tiktok.play, 'mp4'));
      }

      send({
        body: `== [ AUTODOWN TIKTOK ] ==\n‣ Tiêu đề: ${tiktok.title}\n‣ Lượt thích: ${tiktok.digg_count}\n‣ Tác giả: ${tiktok.author.nickname}\n‣ ID tiktok: ${tiktok.author.unique_id}`,
        attachment
      });
    }
  } catch (error) {
    // console.error('Error handling event:', error);
  }
};
