const axios = require('axios');
const cheerio = require('cheerio');

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

    const skills = [];
    $('.hero__skills--detail').each((i, elem) => {
      const skillName = $(elem).find('h3').text().trim();
      const skillDescription = $(elem).find('article').html().trim().replace(/<br\s*[\/]?>/gi, '\n');
      skills.push({ skillName, skillDescription });
    });

    const heroData = {
      name: heroName,
      skins,
      skills
    };
    console.log(heroData);
  } catch (error) {
    console.error('Error:', error);
  }
}

const input = require('readline-sync').question('Nhập tên hero: ');
getHeroData(input);