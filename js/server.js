const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

io.on("connection", (socket) => {
    console.log(`player connected, socket id: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`player disconnected, socket id: ${socket.id}`)
    });
});

http.listen(3000, () => console.log("server up"));