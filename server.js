const path = require("path");

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const {Player, Game} = require("./public/src/game.js");
const {generateRoomCode} = require("./public/src/rooms.js");

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log(`player connected, socket id: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`player disconnected, socket id: ${socket.id}`);
    });

    socket.on("generate_room_code", () => {
        let generated_code = generateRoomCode();

        console.log(`room code generated with code ${generated_code}`);
    });

    socket.on("submit_guess", () => {
        console.log(`player clicked submit guess`);
    });
});

http.listen(3000, () => console.log("server up"));  