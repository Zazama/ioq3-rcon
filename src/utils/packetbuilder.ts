const CONNECTIONLESS_PACKET_PREAMBLE = Buffer.from([0xff, 0xff, 0xff, 0xff]);

export function buildConnectionlessBuffer(type: string) {
    return Buffer.concat([
        CONNECTIONLESS_PACKET_PREAMBLE,
        Buffer.from(type, 'ascii')
    ]);
}