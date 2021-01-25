/*
  Copyright Islam El-Ashi <islam@elashi.me>

  This file is part of El-Tetris.

  El-Tetris is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  El-Tetris is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with El-Tetris.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * This file is the core of the El-Tetris algorithm.
 *
 * Features that are used by the algorithm are implemented here.
 */

function GetLandingHeight(last_move) {
    return last_move.landing_height + (last_move.piece.length - 1) / 2;
}

/**
 * The total number of row transitions.
 * A row transition occurs when an empty cell is adjacent to a filled cell
 * on the same row and vice versa.
 */
function GetRowTransitions(board, num_columns) {
    var transitions = 0;
    var last_bit = 1;

    for (var i = 0; i < board.length; ++i) {
        var row = board[i];

        for (var j = 0; j < num_columns; ++j) {
            var bit = (row >> j) & 1;

            if (bit != last_bit) {
                ++transitions;
            }

            last_bit = bit;
        }

        if (bit == 0) {
            ++transitions;
        }
        last_bit = 1;
    }
    return transitions;
}

/**
 * The total number of column transitions.
 * A column transition occurs when an empty cell is adjacent to a filled cell
 * on the same row and vice versa.
 */
function GetColumnTransitions(board, num_columns) {
    var transitions = 0;
    var last_bit = 1;

    for (var i = 0; i < num_columns; ++i) {
        for (var j = 0; j < board.length; ++j) {
            var row = board[j];
            var bit = (row >> i) & 1;

            if (bit != last_bit) {
                ++transitions;
            }

            last_bit = bit;
        }

        last_bit = 1;
    }

    return transitions;
}

function GetNumberOfHoles(board, num_columns) {
    var holes = 0;
    var row_holes = 0x0000;
    var previous_row = board[board.length - 1];

    for (var i = board.length - 2; i >= 0; --i) {
        row_holes = ~board[i] & (previous_row | row_holes);

        for (var j = 0; j < num_columns; ++j) {
            holes += (row_holes >> j) & 1;
        }

        previous_row = board[i];
    }

    return holes;
}

/**
 * A well is a sequence of empty cells above the top piece in a column such
 * that the top cell in the sequence is surrounded (left and right) by occupied
 * cells or a boundary of the board.
 *
 *
 * Args:
 *   board - The game board (an array of integers)
 *   num_columns - Number of columns in the board
 *
 * Return:
 *    The well sums. For a well of length n, we define the well sums as
 *    1 + 2 + 3 + ... + n. This gives more significance to deeper holes.
 */
function GetWellSums(board, num_columns) {
    var well_sums = 0;

    // Check for well cells in the "inner columns" of the board.
    // "Inner columns" are the columns that aren't touching the edge of the board.
    for (var i = 1; i < num_columns - 1; ++i) {
        for (var j = board.length - 1; j >= 0; --j) {
            if (
                ((board[j] >> i) & 1) == 0 &&
                ((board[j] >> (i - 1)) & 1) == 1 &&
                ((board[j] >> (i + 1)) & 1) == 1
            ) {
                // Found well cell, count it + the number of empty cells below it.
                ++well_sums;

                for (var k = j - 1; k >= 0; --k) {
                    if (((board[k] >> i) & 1) == 0) {
                        ++well_sums;
                    } else {
                        break;
                    }
                }
            }
        }
    }

    // Check for well cells in the leftmost column of the board.
    for (var j = board.length - 1; j >= 0; --j) {
        if (((board[j] >> 0) & 1) == 0 && ((board[j] >> (0 + 1)) & 1) == 1) {
            // Found well cell, count it + the number of empty cells below it.
            ++well_sums;

            for (var k = j - 1; k >= 0; --k) {
                if (((board[k] >> 0) & 1) == 0) {
                    ++well_sums;
                } else {
                    break;
                }
            }
        }
    }

    // Check for well cells in the rightmost column of the board.
    for (var j = board.length - 1; j >= 0; --j) {
        if (
            ((board[j] >> (num_columns - 1)) & 1) == 0 &&
            ((board[j] >> (num_columns - 2)) & 1) == 1
        ) {
            // Found well cell, count it + the number of empty cells below it.

            ++well_sums;
            for (var k = j - 1; k >= 0; --k) {
                if (((board[k] >> (num_columns - 1)) & 1) == 0) {
                    ++well_sums;
                } else {
                    break;
                }
            }
        }
    }

    return well_sums;
}

/**
 * Defines the shapes and dimensions of the tetrominoes.
 */
var PIECES = [];

/* 'I' piece:
  Orientations:

  X
  X       XXXXX
  X
  X
  */
PIECES[0] = [
    {
        orientation: [parse('1111')],
        width: 4,
        height: 1
    },
    {
        orientation: [1, 1, 1, 1],
        width: 1,
        height: 4
    }
];

/**
 * 'T' piece
 * Orientations:
 *
 *  O     O      O    OOO
 * OOO    OO    OO     O
 *        O      O
 */
PIECES[1] = [
    {
        orientation: [parse('010'), parse('111')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('10'), parse('11'), parse('10')].reverse(),
        width: 2,
        height: 3
    },
    {
        orientation: [parse('111'), parse('010')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('01'), parse('11'), parse('01')].reverse(),
        width: 2,
        height: 3
    }
];

/**
 * 'O' piece
 * Orientations:
 *
 * OO
 * OO
 */
PIECES[2] = [
    {
        orientation: [parse('11'), parse('11')],
        width: 2,
        height: 2
    }
];

/**
 * 'J' piece
 * Orientations:
 *
 * O      OO    OOO    O
 * OOO    O       O    O
 *        O           OO
 */
PIECES[3] = [
    {
        orientation: [parse('100'), parse('111')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('11'), parse('10'), parse('10')].reverse(),
        width: 2,
        height: 3
    },
    {
        orientation: [parse('111'), parse('001')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('01'), parse('01'), parse('11')].reverse(),
        width: 2,
        height: 3
    }
];

/**
 * 'L' piece
 * Orientations:
 *
 *   O    OO    OOO    O
 * OOO     O    O      O
 *         O           OO
 */
PIECES[4] = [
    {
        orientation: [parse('001'), parse('111')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('10'), parse('10'), parse('11')].reverse(),
        width: 2,
        height: 3
    },
    {
        orientation: [parse('111'), parse('100')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('11'), parse('01'), parse('01')].reverse(),
        width: 2,
        height: 3
    }
];

/**
 * 'S' piece
 * Orientations:
 *
 *  OO    O
 * OO     OO
 *         O
 */
PIECES[5] = [
    {
        orientation: [parse('011'), parse('110')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('10'), parse('11'), parse('01')].reverse(),
        width: 2,
        height: 3
    }
];

/**
 * 'Z' piece
 * Orientations:
 *
 * OO      O
 *  OO    OO
 *        O
 */
PIECES[6] = [
    {
        orientation: [parse('110'), parse('011')].reverse(),
        width: 3,
        height: 2
    },
    {
        orientation: [parse('01'), parse('11'), parse('10')].reverse(),
        width: 2,
        height: 3
    }
];

function parse(x) {
    return parseInt(x.split('').reverse().join(''), 2);
}

/**
 * Handles game dynamics (Choosing a piece, placing a piece, etc...)
 */

/**
 * Initialize an El-Tetris game.
 *
 * Args:
 *  number_of_columns - Number of columns in the tetris game.
 *  number_of_rows - Number of rows in the tetris game.
 */
function ElTetris(number_of_columns, number_of_rows) {
    this.number_of_rows = number_of_rows;
    this.number_of_columns = number_of_columns;
    this.rows_completed = 0;

    // The board is represented as an array of integers, one integer for each row.
    this.board = new Array(number_of_rows);

    for (var i = 0; i < number_of_rows; i++) {
        this.board[i] = 0;
    }

    this.FULLROW = Math.pow(2, number_of_columns) - 1;
}

ElTetris.prototype.play = function () {
    var piece = this.getRandomPiece();
    var move = this.pickMove(piece);

    var last_move = this.playMove(this.board, move.orientation, move.column);

    if (!last_move.game_over) {
        this.rows_completed += last_move.rows_removed;
    }

    return last_move;
};

/**
 * Pick the best move possible (orientation and location) as determined by the
 * evaluation function.
 *
 * Given a tetris piece, tries all possible orientations and locations and to
 * calculate (what it thinks) is the best move.
 *
 * Args:
 *  piece - A tetris piece.
 *
 * Returns:
 *   An object containing the following attributes:
 *     * orientation - The orientation of the piece to use.
 *     * column - The column at which to place the piece.
 */
ElTetris.prototype.pickMove = function (pieceIndex) {
    var piece = PIECES[pieceIndex];
    var best_evaluation = -100000;
    var best_orientation = 0;
    var best_column = 0;
    var evaluation = undefined;

    // Evaluate all possible orientations
    for (var i in piece) {
        var orientation = piece[i].orientation;

        // Evaluate all possible columns
        for (var j = 0; j < this.number_of_columns - piece[i].width + 1; j++) {
            // Copy current board
            var board = this.board.slice();
            var last_move = this.playMove(board, orientation, j);

            if (!last_move.game_over) {
                evaluation = this.evaluateBoard(last_move, board);

                if (evaluation > best_evaluation) {
                    best_evaluation = evaluation;
                    best_orientation = i;
                    best_column = j;
                }
            }
        }
    }

    return {
        orientation: piece[best_orientation].orientation,
        column: best_column,
        orientationIndex: best_orientation
    };
};

/**
 * Evaluate the board, giving a higher score to boards that "look" better.
 *
 * Args:
 *   last_move - An object containing the following information on the
 *               last move played:
 *                 * landing_height: the row at which the last piece was played
 *                 * piece: the last piece played
 *                 * rows_removed: how many rows were removed in the last move
 *
 * Returns:
 *   A number indicating how "good" a board is, the higher the number, the
 *   better the board.
 */
ElTetris.prototype.evaluateBoard = function (last_move, board) {
    return (
        GetLandingHeight(last_move) * -4.500158825082766 +
        last_move.rows_removed * 3.4181268101392694 +
        GetRowTransitions(board, this.number_of_columns) * -3.2178882868487753 +
        GetColumnTransitions(board, this.number_of_columns) *
            -9.348695305445199 +
        GetNumberOfHoles(board, this.number_of_columns) * -7.899265427351652 +
        GetWellSums(board, this.number_of_columns) * -3.3855972247263626
    );
};

/**
 * Play the given piece at the specified location.
 *
 * Args:
 *  board - The game board.
 *  piece - The piece to play.
 *  column - The column at which to place the piece.
 *
 * Returns:
 *   True if play succeeded, False if game is over.
 */
ElTetris.prototype.playMove = function (board, piece, column) {
    piece = this.movePiece(piece, column);
    var placementRow = this.getPlacementRow(board, piece);
    var rowsRemoved = 0;

    if (placementRow + piece.length > this.number_of_rows) {
        // Game over.
        return { game_over: true };
    }

    // Add piece to board.
    for (var i = 0; i < piece.length; i++) {
        board[placementRow + i] |= piece[i];
    }

    // Remove any full rows
    for (i = 0; i < piece.length; i++) {
        if (board[placementRow + i] == this.FULLROW) {
            board.splice(placementRow + i, 1);
            // Add an empty row on top.
            board.push(0);
            // Since we have decreased the number of rows by one, we need to adjust
            // the index accordingly.
            i--;
            rowsRemoved++;
        }
    }

    return {
        landing_height: placementRow,
        piece: piece,
        rows_removed: rowsRemoved,
        game_over: false
    };
};

/**
 * Given a piece, return the row at which it should be placed.
 */
ElTetris.prototype.getPlacementRow = function (board, piece) {
    // Descend from top to find the highest row that will collide
    // with the our piece.
    for (var row = this.number_of_rows - piece.length; row >= 0; row--) {
        // Check if piece collides with the cells of the current row.
        for (var i = 0; i < piece.length; i++) {
            if ((board[row + i] & piece[i]) !== 0) {
                // Found collision - place piece on row above.
                return row + 1;
            }
        }
    }

    return 0; // No collision found, piece should be placed on first row.
};

ElTetris.prototype.movePiece = function (piece, column) {
    // Make a new copy of the piece
    var newPiece = piece.slice();
    for (var i = 0; i < piece.length; i++) {
        newPiece[i] = piece[i] << column;
    }

    return newPiece;
};

ElTetris.prototype.getRandomPieceIndex = function () {
    return Math.floor(Math.random() * PIECES.length);
};

ElTetris.prototype.getRandomPiece = function () {
    return PIECES[this.getRandomPieceIndex()];
};

function drawRow(rowNumber, rowValue) {
    for (var i = 0; i < 10 && rowValue !== 0; i++) {
        if (rowValue & 1) {
            process.stdout.write('x');
        } else {
            process.stdout.write('-');
        }

        rowValue = rowValue >> 1;
    }
}

function drawBoard(board) {
    // Fill cells
    for (let row = 10; row >= 0; row--) {
        drawRow(row, board[row]);
        console.log();
    }
}

ElTetris.drawBoard = drawBoard;
module.exports = ElTetris;
