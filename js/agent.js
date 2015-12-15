// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    if (moved) {
        this.addRandomTile();
    }
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function Agent() {
};


/*
 * BEGIN 2048 AI.
 *
 * HEURISTICS:
 * 1. Weight each cell so that cells gravitate towards a corner for merging
 * 2. Give bonus points for the maximum value cell on a given game state
 * 3. Give bonus multiplier for the number of free tiles on a given game state
 * 4. Give slight advantage to game states in which tiles of similar numbers stay near eachother
 *
 * AT DEPTH = 5:
 * 1024 Tile: ~100%
 * 2048 Tile: ~30%
*/

Agent.prototype.selectMove = function (gameManager) {
    var state  = new AgentBrain(gameManager);
    var moves  = this.validMoves(state);
    var max    = 0; // chose the move resulting in the best score at a given depth.
    var choice = moves[0]; // default to the only move remaining if needed.
    var depth  = 5; // depth for ai to search into game tree
    
    /*
     * Now we ask the AI to score each possible move at this state by evaluating it against heuristics
     * and testing future states at depth x.
    */
    for (var i = 0; i < moves.length; i++) {
        state.move(moves[i]); // choose first valid position to move
        var temp = this.ai(state, depth, true, 0); // calculate utility of move at new state
        
        if (temp > max) { // if a better move is found, store it.
            max = temp;
            choice = moves[i];
        }
        state.reset(); // reset the game state for the next loop.
    } 
    
    return choice; // choose the move at current state with the highest utility found by the AI.
};


/*
 * This AI is an expectimax algorithm with minor pruning. 
 * It relies on the heuristics function, this.utility() for calculating the score
 * of a game state.
*/
Agent.prototype.ai = function (theState, depth, playerOne, alpha) {
    var state = new AgentBrain(theState); 
    var moves = this.validMoves(state);
    
    if (moves.length == 0) { // avoid game losing states
        return Number.MIN_VALUE;
    }
    if (depth == 0) { // base case.
        return this.utility(state);
    }

    if (playerOne) {
        for (var i = 0; i < moves.length; i++) {
            state.move(moves[i]); // check child state
            var temp = this.ai(state, depth - 1, false, alpha); // find the maximum utility for depth given
            if (alpha > temp) {
                break; // prune the children that we won't choose.
            } 
            alpha = Math.max(temp, alpha);
            state.reset();
        }
        return alpha;
    } else { // perform expectation 
        var avg = 0;
        for (var i = 0; i < moves.length; i++) {
            state.addRandomTile();
            state.move(moves[i]);
            avg += this.ai(state, depth - 1, true, alpha);
            state.reset();
        } return avg / moves.length;
    }
}


/*
 * This function takes the object board, and turns it into a 2d array of integers, with 0 representing empty tiles.
*/
Agent.prototype.gameBoard = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var oGrid = state.grid.cells;
    var grid  = new Array(4); // create row

    for (var i = 0; i < oGrid.length; i++) {
        grid[i] = []; // create column
        for (var k = 0; k < oGrid[i].length; k++) {
            if (oGrid[i][k] != null) {
                // place value in grid.
                grid[i][k] = oGrid[i][k].value;
            } else {
                // condition for a missing object
                grid[i][k] = 0;
            }
        }
    } return grid;
}

/*
 * This helper method returns an array of all valid moves for a given game state.
*/
Agent.prototype.validMoves = function (theState) {
   var state = new AgentBrain(theState); 
   var moves = new Array(); // i = 0: up, 1: right, 2: down, 3: left

   for (var i = 0; i < 4; i++) {
       if (state.move(i)) {
           moves.push(i); // move is possible
           state.reset(); // reset for next test
       }
   } return moves;
}

/*
 * This utility function scores a given game state based on a number of heuristics.
*/
Agent.prototype.utility = function (theState) {
    var state = new AgentBrain(theState);
    var score = 0;

    // collect heuristic values
    var heuristics = this.heuristics(state);
    var gradient = heuristics.gradient;
    var free     = heuristics.free;
    var max      = heuristics.max;
    var smooth   = heuristics.smooth;
    var isWin    = heuristics.isWin;
    
    // maintain modifiers to keep values consistent
    var gMod = 1.7;
    var fMod = 0.5; // returns penalty for less than 2 free tiles.
    var mMod = 1;
    var sMod = 0.1;

    // add up heuristics and calculate in modifers
    score = (gradient * gMod) + (max * mMod) + (smooth * sMod);
    score = score * Math.pow((free * fMod), 2); // Free tiles worth more ea, the more there are.
    if (isWin) { score = Number.MAX_VALUE; } // lets win the game!

    return score;
}

/*
 * This heuristics function combines all of the heuristics functions below into one loop.
 * This saves a good bit of time per calculation.
*/
Agent.prototype.heuristics = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var grid  = this.gameBoard(state); // get the 2d grid array for the current state
    var weights = [[0.4, 0.4, 0.2, 0.099937],
                  [0.4, 0.4, 0.076711, 0.0724143],
                  [0.2, 0.0562579, 0.037116, 0.0161889],
                  [0.0125498, 0.00992495, 0.00575871, 0.00335193]];

    var gradient = 0;
    var free     = 0;
    var max      = 0;
    var smooth   = 0;
    var isWin    = false;

    for (var i = 0; i < 4; i++) {
        for (var k = 0; k < 4; k++) {
            /*
             * CALCULATE SMOOTHNESS.
            */
            if (i > 0 && k > 0) {
                if (grid[i - 1][k] == grid[i][k] * 2 || grid[i - 1][k] == grid[i][k] / 2) {
                    smooth++;
                } if (grid[i][k - 1] == grid[i][k] * 2 || grid[i][k - 1] == grid[i][k] / 2) {
                    smooth++;
                }
            }
            /*
             * CALCULATE GRADIENT.
            */
            gradient += (grid[i][k] * weights[i][k]);
            /*
             * CALCULATE MAX.
            */
            max = Math.max(grid[i][k], max);
            /*
             * COUNT FREE TILES.
            */
            if (grid[i][k] == 0) {
                free++;
            }
            /*
             * CHECK IF WIN.
            */
            if (grid[i][k] >= 2048) {
                isWin = true;
            }
        }
    } return { gradient: gradient, free: free, max: max, smooth: smooth, isWin: isWin };
}


/*
 * This helper method returns true if a 2048 or larger tile exists on the game board.
*/
Agent.prototype.isWin = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var grid  = this.gameBoard(state); // get the 2d grid array for the current state

    for (var i = 0; i < 4; i++) {
        for (var k = 0; k < 4; k++) {
            if (grid[i][k] >= 2048) {
                return true;
            }
        }
    } return false;
}

/*
 * This helper method returns the number of empty tiles on the game board.
*/
Agent.prototype.freeTiles = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var grid  = this.gameBoard(state); // get the 2d grid array for the current state
    var free  = 1;

    for (var i = 0; i < 4; i++) {
        for (var k = 0; k < 4; k++) {
            if (grid[i][k] == 0) {
                free++;
            }
        }
    }
    return free;
}

/*
 * Find and return the largest value in the grid.
*/
Agent.prototype.max = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var grid  = this.gameBoard(state); // get the 2d grid array for the current state
    var max   = 0;

    for (var i = 0; i < 4; i++) {
        for (var k = 0; k < 4; k++) {
            max = Math.max(grid[i][k], max); // keep only the largest value
        }
    } return max;
}

/*
 * Assign a score based on the position of the highest values.
 * The top-left hand corner should have the largest values.
*/
Agent.prototype.gradient = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var grid  = this.gameBoard(state); // get the 2d grid array for the current state
    var score = 0; // set up default score
    var weights = [[0.135759, 0.121925, 0.102812, 0.099937],
                  [0.0997992, 0.08884805, 0.076711, 0.0724143],
                  [0.060654, 0.0562579, 0.037116, 0.0161889],
                  [0.0125498, 0.00992495, 0.00575871, 0.00335193]];

    for (var i = 0; i < 4; i++) {
        for (var k = 0; k < 4; k++) {
            /*
             * Weighting method: Manually assign tile weights in the weights array.
            */
            score = score + (grid[i][k] * weights[i][k]);

        }
    } return score;
}

/*
 * Evaluate the game board, giving points if nearbye tiles have a similar value.
*/
Agent.prototype.smoothness = function (theState) {
    var state = new AgentBrain(theState); // clone the state
    var grid  = this.gameBoard(state); // get the 2d grid array for the current state
    var score = 0; // set up default score

    for (var i = 0; i < 4; i++) {
        for (var k = 0; k < 4; k++) {

            if (i > 0 && k > 0) {
                if (grid[i - 1][k] == grid[i][k] * 2 || grid[i - 1][k] == grid[i][k] / 2) {
                    score++;
                }
                if (grid[i][k - 1] == grid[i][k] * 2 || grid[i][k - 1] == grid[i][k] / 2) {
                    score++;
                }
            }

        }
    } return score;
}
