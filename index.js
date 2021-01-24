const ElTetris = require('./eltetris');
const averageColour = require('average-colour');
const { spawn } = require('child_process');

const robot = require('robotjs');
robot.setXDisplayName(':99');

const URL = 'https://tetr.io';

// the position and sizes of where the next pieces will be
const NEXT_PIECE_POSITION_X = 479;
const NEXT_PIECE_POSITION_Y = 173;
const NEXT_PIECE_WIDTH = 69;
const NEXT_PIECE_HEIGHT = 42;
const NEXT_PIECE_COUNT = 5;

const JOIN_X = 400;
const JOIN_Y = 430;

const SOLO_X = 470;
const SOLO_Y = 440;

const ZEN_X = 470;
const ZEN_Y = 440;

const START_X = 592;
const START_Y = 324;

// colours of the blocks
const PIECE_COLOURS = {
    T: '#b151a7',
    L: '#ba6d3e',
    O: '#b9a13c',
    J: '#7969c6',
    I: '#3db388',
    Z: '#bb3e44',
    S: '#82ac3b'
};

const PIECE_INDEXES = {
    I: 0,
    T: 1,
    O: 2,
    J: 3,
    L: 4,
    S: 5,
    Z: 6
};

// where each orientation will be placed
const ORIENTATION_COLUMNS = {
    I: [4, 6],
    T: [4, 5, 4, 4],
    O: [5],
    L: [4, 5, 4, 4],
    S: [4, 5, 4, 4],
    J: [4, 5, 4, 4],
    Z: [4, 5, 4, 4]
};

const nearestColour = require('nearest-color').from(PIECE_COLOURS);

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

function getLuminence(colour) {
    const r = Number.parseInt(colour.slice(0, 2), 16);
    const g = Number.parseInt(colour.slice(2, 4), 16);
    const b = Number.parseInt(colour.slice(4, 6), 16);

    //console.log(colour, (0.2126*r + 0.7152*g + 0.0722*b));
    return (0.2126*r + 0.7152*g + 0.0722*b);
}

class TetrioBot {
    constructor() {
        this.currentPiece = undefined;
        this.currentColumn = 4; // 5 if O

        this.eltetris = new ElTetris(10, 20);
    }

    async launchChromium() {
        spawn('chromium', ['--start-fullscreen', URL]);
        //spawn('feh', ['-F', __dirname + '/screenshot.png']);
        await sleep(5000);
    }

    // click through the menus to start zen mode
    async startGame() {
        // join as guest
        robot.moveMouse(JOIN_X, JOIN_Y);
        robot.mouseClick();

        await sleep(1200);

        // click solo
        robot.moveMouse(SOLO_X, SOLO_Y);
        robot.mouseClick();

        await sleep(1200);

        // click zen
        robot.moveMouse(ZEN_X, ZEN_Y);
        robot.mouseClick();

        await sleep(1200);

        // start zen
        robot.moveMouse(START_X, START_Y);
        robot.mouseClick();

        // wait until we make it to the countdown
        await sleep(6200);

        this.currentPieces = this.getNextPieces();
        this.getNextPiece();

        // wait until countdown is finished
        await sleep(1800);
    }

    // return the piece letters from the right side (in the order they'll drop
    // in)
    getNextPieces() {
        const nextPiecesBitmap = robot.screen.capture(
            NEXT_PIECE_POSITION_X,
            NEXT_PIECE_POSITION_Y,
            NEXT_PIECE_WIDTH,
            NEXT_PIECE_HEIGHT * NEXT_PIECE_COUNT
        );

        const pieces = [];

        for (let i = 0; i < NEXT_PIECE_COUNT; i += 1) {
            let x = 0;
            let y = i * NEXT_PIECE_HEIGHT;

            const distance = Math.sqrt(
                Math.pow(NEXT_PIECE_WIDTH / 2, 2) +
                    Math.pow(NEXT_PIECE_HEIGHT / 2, 2)
            );

            const colours = [];

            for (let j = 0; j < Math.floor(distance); j += 1) {
                const colour = nextPiecesBitmap.colorAt(x + j, y + j);

                if (getLuminence(colour) <= 70) {
                    continue;
                }

                //console.log(colour);
                colours.push(`#${colour}`);
            }

            pieces.push(nearestColour(averageColour(colours)).name);
            console.log(pieces[pieces.length - 1], averageColour(colours), colours);
        }

        /*const x = Math.floor(NEXT_PIECE_WIDTH / 2);
        let y = 0;

        for (let i = 0; i < NEXT_PIECE_COUNT; i += 1) {
            const colour = nextPiecesBitmap.colorAt(
                x,
                Math.floor(y + NEXT_PIECE_HEIGHT / 2)
            );

            y += NEXT_PIECE_HEIGHT;

            console.log(colour, nearestColour(colour).name);
            pieces.push(nearestColour(colour).name);
        }*/

        spawn('import', ['-w', 'root', `./screenshot-${pieces.join(',')}.png`]);

        return pieces;
    }

    async moveLeft() {
        console.log('left');
        robot.keyTap('left');
        await sleep(250);
    }

    async moveRight() {
        console.log('right');
        robot.keyTap('right');
        await sleep(250);
    }

    async dropPiece() {
        console.log('drop');
        robot.keyTap('space');
        await sleep(250);
    }

    async changeToOrientation(orientation) {
        console.log('change to orientation', orientation);

        for (let i = 0; i < orientation; i += 1) {
            robot.keyTap('up');
            await sleep(250);
        }

        this.currentColumn =
            ORIENTATION_COLUMNS[this.currentPiece][orientation];
    }

    async moveToColumn(column) {
        console.log('our column', this.currentColumn);
        console.log('goal column', column);

        const deltaColumns = column - this.currentColumn;

        if (deltaColumns < 0) {
            for (let i = 0; i < Math.abs(deltaColumns); i += 1) {
                await this.moveLeft();
            }
        } else if (deltaColumns > 0) {
            for (let i = 0; i < Math.abs(deltaColumns); i += 1) {
                await this.moveRight();
            }
        }
    }

    // call this after we place a piece
    getNextPiece() {
        this.currentPiece = this.currentPieces.shift();

        if (!this.currentPieces.length) {
            this.currentPieces = this.getNextPieces();
        }

        this.currentColumn = this.currentPiece === 'O' ? 5 : 4;
    }

    async playMove() {
        console.log('current piece', this.currentPiece);

        const {
            orientationIndex,
            orientation,
            column
        } = this.eltetris.pickMove(PIECE_INDEXES[this.currentPiece]);

        await this.changeToOrientation(orientationIndex);
        await this.moveToColumn(column);
        this.getNextPiece();
        await this.dropPiece();
        this.eltetris.playMove(this.eltetris.board, orientation, column);
    }

    async init() {
        await this.launchChromium();
        await this.startGame();

        while (true) {
            await this.playMove();
            await sleep(1000);
        }
    }
}

(async () => {
    const tetrioBot = new TetrioBot();
    await tetrioBot.init();
})();
