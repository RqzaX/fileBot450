module.exports.config = {
    name: "skinlqmb",
    version: "4.1.0",
    hasPermssion: 0,
    credits: "Vtuan",
    description: "Hiển thị thông tin tướng và skin trong Liên Quân",
    commandCategory: "Ảnh",
    usages: "",
    cooldowns: 0
  };
  
  const axios = require('axios');
  const cheerio = require('cheerio');
  const request = require('request');
  const fs = require("fs");
  
  async function getAllHeroes() {
    try {
        const url = 'https://lienquan.garena.vn/hoc-vien/tuong-skin/';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
  
        const heroes = [];
  
        $('a.st-heroes__item').each((i, elem) => {
            const heroName = $(elem).find('h2.st-heroes__item--name').text().trim();
            const heroImage = $(elem).find('div.st-heroes__item--img img').attr('src');
            const heroLink = $(elem).attr('href');
  
            if (heroName) {
                heroes.push({ name: heroName, image: heroImage, link: heroLink });
            }
        });
        return heroes;
    } catch (error) {
        console.error('Error in getAllHeroes:', error);
        return [];
    }
  }
  
  async function getHeroData(heroName) {
    try {
        const names = heroName.toLowerCase().replace(/\s+/g, '-');
        const url = `https://lienquan.garena.vn/hoc-vien/tuong-skin/d/${names}/`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
  
        const skins = [];
        $('.hero__skins--detail').each((i, elem) => {
            const name = $(elem).find('h3').text().trim();
            const skinImageUrl = $(elem).find('picture img').attr('src');
            skins.push({ name, skinImageUrl });
        });
  
        return { skins };
    } catch (error) {
        console.error('Error in getHeroData:', error);
        return null;
    }
  }
  
  function vtuanhihi(image, vtuandz, callback) {
    request(image).pipe(fs.createWriteStream(__dirname + `/` + vtuandz)).on("close", callback);
  }
  
  module.exports.run = async ({ api, event }) => {
    try {
        const heroes = await getAllHeroes();
        if (heroes.length === 0) {
            return api.sendMessage("Không thể lấy danh sách tướng. Vui lòng thử lại sau!", event.threadID, event.messageID);
        }
  
        const randomHero = heroes[Math.floor(Math.random() * heroes.length)];
        const heroData = await getHeroData(randomHero.name);
  
        if (!heroData) {
            return api.sendMessage(`Không thể lấy thông tin cho tướng: ${randomHero.name}. Vui lòng thử lại sau!`, event.threadID, event.messageID);
        }
  
        const { skins } = heroData;
  
        if (skins.length === 0) {
            return api.sendMessage(`Tướng ${randomHero.name} không có skin nào.`, event.threadID, event.messageID);
        }
  
        const numImages = skins.length;
        let imagesDownloaded = 0;
        let attachments = [];
  
        skins.forEach((skin, index) => {
            const imgFileName = `skin_${index}.jpg`;
            vtuanhihi(skin.skinImageUrl, imgFileName, () => {
                imagesDownloaded++;
                attachments.push(fs.createReadStream(__dirname + `/${imgFileName}`));
  
                if (imagesDownloaded === numImages) {
                    api.sendMessage({
                        body: `${randomHero.name}`,
                        attachment: attachments
                    }, event.threadID, () => {
                        for (let img of attachments) {
                            fs.unlinkSync(img.path);
                        }
                    }, event.messageID);
                }
            });
        });
    } catch (error) {
        console.error('Error in run:', error);
        return api.sendMessage("Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau!", event.threadID, event.messageID);
    }
  };
  