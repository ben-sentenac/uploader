import net from "node:net";
import process from "node:process";
import { open } from "node:fs/promises";
import path from "node:path";



const clearline = (direction) => new Promise((resolve, reject) => {
    process.stdout.clearLine(direction, () => resolve());
});

const moveCursor = (x, y) => new Promise((resolve, reject) => process.stdout.moveCursor(x, y, () => resolve()));


//TODO prompt must be in this format : node client.js <host>:<port?> <file_to_upload>
const [serverAddress, fileToUpload] = process.argv.slice(2);

const [host, port] = serverAddress.split(':');

const fileHandle = await open(fileToUpload, 'r');
const fileSize = (await fileHandle.stat()).size;

const fileName = path.basename(fileToUpload);

//Upload progress 
let bytesRead = 0;
let uploadedPercentage = 0;

const readStream = fileHandle.createReadStream();

const client = net
    .createConnection({ host, port }, () => {

        console.log("connected to the server");
        console.log();
        client.write(`filename: ${fileName}****`);
        readStream.on('data', async (chunk) => {
            if (!client.write(chunk)) {
                //console.log('backpressure!!');
                readStream.pause();
            }

            bytesRead += chunk.length;
            let newPercentage = Math.floor((bytesRead / fileSize) * 100);
            //reduce number of logs
            if (newPercentage !== uploadedPercentage) {
                uploadedPercentage = newPercentage;
                await moveCursor(0, -1);
                await clearline(0);
                console.log(`${uploadedPercentage}% data read`);
            }
        });
        readStream.on('end', () => {
            //console.log('stream finish reading');
            fileHandle.close();
            client.end();
        })
    })
    .on('drain', () => {
        //console.log('draining....');
        readStream.resume();
    })
    .on('close', () => console.log('closing connection!'))
    .on("error", (err) => console.error(err));
