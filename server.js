const path = require("path");

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const {Player, Game, GameManager} = require("./public/src/game.js");
const {generateRoomCode} = require("./public/src/rooms.js");

app.use(express.static(path.join(__dirname, "public")));

// routing
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
});
app.get("/game", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "game.html"))
});

let gameManager = new GameManager();

io.on("connection", (socket) => {
    console.log(`player connected, socket id: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`player disconnected, socket id: ${socket.id}`);
    });

    socket.on("create_room", () => {
        let generated_code = generateRoomCode();
        gameManager.addGame(generated_code); // uses default constsraints for timer length, max players, etc

        io.emit("update_rooms_list", generated_code);

        console.log(`room code generated with code ${generated_code}`);
    });

    socket.on("submit_guess", () => {
        console.log(`player clicked submit guess`);
    });
});

http.listen(3000, () => console.log("server up"));  