const axios = require('axios');
const cheerio = require('cheerio');

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

    console.log('Danh sách tướng:', heroes);
    return heroes;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

getAllHeroes();
