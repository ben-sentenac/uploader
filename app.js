import net from "node:net";
import { randomUUID } from "node:crypto";
import { open } from "node:fs/promises";
//node -e "process.stdout.write(crypto.randomBytes(1e9))" > big.file
const server = net.createServer();

const clients = [];

server
    .on("connection", (socket) => {
        const clientId = randomUUID();
        console.log(`-> new connection! client Id:${clientId}`, new Date());
        let fileHandle, writeStream; 

        socket.on('data', async (data) => {
            if(!fileHandle) {
                socket.pause();//stop receiving data
                const separator = data.indexOf('****');
                const fileName = data.subarray(10,separator).toString('utf-8');

                fileHandle = await open(`storage/${fileName}`,'w');
                writeStream = fileHandle.createWriteStream();

                writeStream.write(data.subarray(separator + 4));
                socket.resume();

                writeStream.on('drain', () => socket.resume());
            } else {
                if(!writeStream.write(data)) {
                    //backpressure
                    socket.pause();
                }
            }
        });

        socket.on('end', () => {
            fileHandle.close();
            fileHandle = undefined;
            writeStream = undefined;
            socket.end();
            console.log('download complete!');
            console.log('connection ended');
        })

        clients.push({ clientId, socket });
    })
    .on("error", (err) => {
        console.log(err);
        throw err;
    })
    .on("listening", () => {
        console.log(
            "--------------------------------------------------------------------------------"
        );
        console.log("UPLOADER SERVER");
        console.log(new Date().toLocaleString("fr"));
        console.log("server is listening on:", server.address());
        console.log(
            "--------------------------------------------------------------------------------"
        );
    })
    .listen({ port: 3000, host: "::" });
