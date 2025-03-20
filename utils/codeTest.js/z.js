const chalk = require('chalk');
const a = "anh yếu ẻm"
const b = 48;
let offset = 0;
let text = ' '.repeat(b);
setInterval(() => {
    let visiblePart = text.slice(0, b);
    let r = '' + chalk.blue(visiblePart) + '';
    process.stdout.write('\r' + r);
    if (offset < a.length) {
        text = text.slice(1) + a[offset];
    } else {
        text = text.slice(1) + ' ';
    }
    offset++;
    if (offset > a.length + b) {
        offset = 0;
        text = ' '.repeat(b);
    }
}, 200);