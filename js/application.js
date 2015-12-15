// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
    var gm = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
    var agent = new AgentManager(gm);
    gm.agent = agent;
});
