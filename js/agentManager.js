// This code runs the simulation and sends the selected moves to the game
function AgentManager(gameManager) {
    this.gameManager = gameManager;
    this.agent = new Agent();
    this.moveCount = 0;
};

AgentManager.prototype.selectMove = function () {
    // 0: up, 1: right, 2: down, 3: left
    //if (this.gameManager.over) setTimeout(this.gameManager.restart.bind(this.gameManager), 1000);
    //else
    //    if (!this.gameManager.move(this.agent.selectMove(this.gameManager))) console.log("bad move");

    // game over
    if (this.gameManager.over) {
        console.log(this.gameManager.score + " in " + this.moveCount + " moves.");

        this.moveCount = 0;
        setTimeout(this.gameManager.restart.bind(this.gameManager), 1000);
    } else { // game ongoing
        if (this.gameManager.won && !this.gameManager.keepPlaying) {
            this.gameManager.keepplaying();
            this.selectMove();
            console.log("Game Won!");
        }
        else {
            if (!this.gameManager.move(this.agent.selectMove(this.gameManager))) console.log("bad move");
            else this.moveCount++;
        }
    }
};