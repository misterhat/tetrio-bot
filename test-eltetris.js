const ElTetris = require('./eltetris');
const eltetris = new ElTetris(10, 20);

const PIECE_INDEXES = {
    I: 0,
    T: 1,
    O: 2,
    J: 3,
    L: 4,
    S: 5,
    Z: 6
};

for (const piece of ['I','Z','S','T']) {
    const {
        orientationIndex,
        orientation,
        column
    } = eltetris.pickMove(PIECE_INDEXES[piece]);

    eltetris.playMove(eltetris.board, orientation, column);
    //console.log(+orientationIndex, column);
    console.log(piece, 'o:', orientationIndex, '. c:', column);
    ElTetris.drawBoard(eltetris.board);
}

