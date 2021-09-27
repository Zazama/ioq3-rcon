import dgram = require('dgram');

export function send(data: Buffer, address: string, port: number, timeoutMs: number = 8000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const client = dgram.createSocket('udp4');
        let response: Buffer = null;
        let closed = false;
        let error = null;
        const timer = setTimeout(() => {
            if(!closed) {
                error = new Error('timeout');
                client.close();
            }
        }, timeoutMs);

        client.send(data, 0, data.length, port, address, (err) => {
            if(err) {
                error = err;
                closed = true;
                client.close();
            }
        });

        client.on('error', (err) => {
            error = err;
            closed = true;
            client.close();
        });

        client.on('message', (msg) => {
            if(error === null) {
                response = msg;
                client.close();
            }
        });

        client.on('close', () => {
            clearTimeout(timer);
            if(error) {
                reject(error);
            } else if(response !== null) {
                resolve(response);
            } else {
                resolve(Buffer.alloc(0));
            }
        });
    });
}