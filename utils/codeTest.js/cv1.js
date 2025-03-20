const bàn_cờ = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'], // Hàng quân đen
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'], // Hàng tốt quân đen
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '], // Ô trống
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '], // Ô trống
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '], // Ô trống
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '], // Ô trống
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'], // Hàng tốt quân trắng
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']  // Hàng quân trắng
];

const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function ve_ban_co(boardState) {
    const canvas = createCanvas(450, 450);
    const ctx = canvas.getContext('2d');
    const tileSize = 50;
    const boardSize = tileSize * 8;
    const borderSize = tileSize / 2;

    const color1 = '#ffffff'; // Trắng
    const color2 = '#d0f0c0'; // Xanh lá cây nhạt

    // Vẽ các ô trên bàn cờ
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
            ctx.fillRect(col * tileSize + borderSize, row * tileSize + borderSize, tileSize, tileSize);
        }
    }

    const imagePath = path.join(__dirname, 'FolderGame/covua/image');
    const pieces = {
        wK: "white-king.png",
        wQ: "white-queen.png",
        wR: "white-rook.png",
        wB: "white-bishop.png",
        wN: "white-knight.png",
        wP: "white-pawn.png",
        bK: "black-king.png",
        bQ: "black-queen.png",
        bR: "black-rook.png",
        bB: "black-bishop.png",
        bN: "black-knight.png",
        bP: "black-pawn.png",
    };

    // Vẽ quân cờ từ trạng thái bàn cờ mới
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col].trim();
            if (piece && pieces[piece]) {
                const image = await loadImage(path.join(imagePath, pieces[piece]));
                ctx.drawImage(image, col * tileSize + borderSize, row * tileSize + borderSize, tileSize, tileSize);
            }
        }
    }

    // Vẽ viền bàn cờ
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = borderSize;
    ctx.strokeRect(borderSize / 2, borderSize / 2, boardSize + borderSize, boardSize + borderSize);

    // Số cột và hàng
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 8; i++) {
        ctx.fillText((8 - i).toString(), borderSize / 2 - 15, (i + 0.5) * tileSize + borderSize);
        ctx.fillText(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][i], (i + 0.5) * tileSize + borderSize, boardSize + borderSize + 25);
    }

    return canvas;
}

function kiểm_tra(fromRow, fromCol, toRow, toCol) {
    const piece = bàn_cờ[fromRow][fromCol].trim();
    const targetPiece = bàn_cờ[toRow][toCol].trim();

    if (!piece) return false; // Ô xuất phát rỗng
    if (piece[0] === targetPiece[0]) return false; // Không được ăn quân cùng màu

    switch (piece[1]) {
        case 'wP': // Tốt trắng
        case 'bP': // Tốt đen
            const direction = 1; // Tốt luôn đi lên
            // Tốt di chuyển một ô
            if (toRow === fromRow + direction && toCol === fromCol && !targetPiece) return true;
            // Tốt di chuyển hai ô từ vị trí xuất phát
            if (fromRow === (piece[0] === 'w' ? 6 : 1) && toRow === fromRow + 2 * direction && toCol === fromCol && !targetPiece) return true;
            // Tốt ăn chéo
            if (toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1 && targetPiece) return true;
            break;
        case 'wR': // Xe trắng
        case 'bR': // Xe đen
            if (fromRow === toRow || fromCol === toCol) return true; // Di chuyển theo hàng hoặc cột
            break;
        case 'wN': // Mã trắng
        case 'bN': // Mã đen
            if ((Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1) || (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2)) return true;
            break;
        case 'wB': // Tượng trắng
        case 'bB': // Tượng đen
            if (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) return true; // Di chuyển chéo
            break;
        case 'wQ': // Hậu trắng
        case 'bQ': // Hậu đen
            if (fromRow === toRow || fromCol === toCol || Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) return true; // Di chuyển giống xe hoặc tượng
            break;
        case 'wK': // Vua trắng
        case 'bK': // Vua đen
            if (Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1) return true; // Di chuyển một ô
            break;
    }
    return false; // Nước đi không hợp lệ
}

// Gọi hàm với trạng thái bàn cờ hiện tại
// ve_ban_co(bàn_cờ).then(canvas => {
//     const fs = require('fs');
//     const out = fs.createWriteStream(path.join(__dirname, 'ban_co.png'));
//     const stream = canvas.createPNGStream();
//     stream.pipe(out);
//     out.on('finish', () => console.log('Đã tạo xong bàn cờ!'));
// });


// Di chuyển quân cờ và vẽ lại bàn cờ
function di_chuyen_quan_cau(fromRow, fromCol, toRow, toCol) {
    if (kiểm_tra(fromRow, fromCol, toRow, toCol)) {
        // Di chuyển quân cờ
        bàn_cờ[toRow][toCol] = bàn_cờ[fromRow][fromCol];
        bàn_cờ[fromRow][fromCol] = '  '; // Đặt ô xuất phát về trống

        // Vẽ lại bàn cờ
        ve_ban_co(bàn_cờ).then(canvas => {
            const fs = require('fs');
            const out = fs.createWriteStream(path.join(__dirname, 'ban_co.png'));
            const stream = canvas.createPNGStream();
            stream.pipe(out);
            out.on('finish', () => console.log('Đã tạo xong bàn cờ!'));
        });
    } else {
        console.log('Nước đi không hợp lệ!');
    }
}

// Ví dụ di chuyển quân cờ từ (6, 4) đến (5, 4) (tốt trắng từ e2 đến e3)
di_chuyen_quan_cau(6, 4, 5, 4);
