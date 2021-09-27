let IOQ3Rcon = require('../src').default
const serverConfig = require('./server.config.json');

const IOQ3_RATE_LIMIT_MS = 150;
const NOT_WORKING_SERVER = { address: '127.0.0.1', port: 1337, rconPassword: 'hi!', timeoutMs: 1000 }
const WORKING_SERVER_NO_RCON = { address: 'eu.b00bs-clan.com', port: 27960 }
const WORKING_SERVER_WITH_RCON = { ...serverConfig }
const RCON_STATUS_VERIFY_REGEX = /map: (.*?)$\nnum(.*?)score(.*?)ping(.*?)name(.*)/m;

describe('mocking', () => {
    afterEach(() => {
        unmockIOQ3Rcon();
    })

    test('test udpclient.send mocking', async () => {
        mockIOQ3Rcon(() => Promise.resolve(Buffer.alloc(2)));
        const client = new IOQ3Rcon(NOT_WORKING_SERVER);
        expect(Buffer.alloc(2).equals(await client.sendRconRaw('test'))).toBe(true);
    })

    test('test udpclient.send mocking afterwards', async () => {
        const client = new IOQ3Rcon(NOT_WORKING_SERVER);
        await expect(client.sendRconRaw('test')).rejects.toThrowError(/(.*)timeout(.*)/);
    })
})

describe('connection', () => {
    test('timeout', async () => {
        const client = new IOQ3Rcon(NOT_WORKING_SERVER);
        let startTime = Date.now();
        await expect(client.sendRconRaw('test')).rejects.toThrowError(/(.*)timeout(.*)/);
        expect(Date.now() - startTime).toBeGreaterThanOrEqual(NOT_WORKING_SERVER.timeoutMs);
    })

    test('serverinfo', async () => {
        const client = new IOQ3Rcon(WORKING_SERVER_NO_RCON);
        await expect(client.getServerInfo()).resolves.toBeDefined();
    })

    test('rcontimeout', async () => {
        const client = new IOQ3Rcon({...WORKING_SERVER_NO_RCON, rconPassword: 'obviouslywrong'});
        let startTime = Date.now();
        await expect(client.sendRconRaw('status')).resolves.toBeDefined();
        expect(Date.now() - startTime).toBeGreaterThanOrEqual(IOQ3_RATE_LIMIT_MS);
    })
})

describe('parsing', () => {
    afterEach(() => {
        unmockIOQ3Rcon();
    })

    test('getServerInfo', async () => {
        mockIOQ3Rcon(() => Promise.resolve(`����infoResponse
            \\modversion\\4.3.4\\game\\q3ut4\\auth\\1\\pure\\1\\gametype\\7\\sv_maxclients\\22\\bots\\0\\clients\\0\\mapname\\ut4_uptown\\hostname\\[b00bs] EURO Uptown CTF\\protocol\\68`))

        const client = new IOQ3Rcon(WORKING_SERVER_NO_RCON);
        const serverInfo = client.sendRaw('getinfo');
        await expect(client.getServerInfo()).resolves.toMatchObject({
            modversion: '4.3.4',
            game: 'q3ut4',
            auth: '1',
            pure: '1',
            gametype: '7',
            sv_maxclients: '22',
            bots: '0',
            clients: '0',
            mapname: 'ut4_uptown',
            hostname: '[b00bs] EURO Uptown CTF',
            protocol: '68'
        });
    })

    test('getServerStatus', async () => {
        mockIOQ3Rcon(() => Promise.resolve(`����statusResponse
        \\sv_allowdownload\\0\\g_matchmode\\0\\g_gametype\\7\\sv_maxclients\\32\\sv_floodprotect\\2\\capturelimit\\10\\sv_hostname\\[b00bs] EURO Uptown CTF\\auth_status\\public\\g_modversion\\4.3.4
        53 250 "dasfg"
        54 150 "W DAS dasf dfyyy"
        48 123 "Mr.assyssqw"
        63 53 "ac"
        51 153 "HAUPTSACHE"
        36 262 "IHM GEHTS GUT"`))

        const client = new IOQ3Rcon(WORKING_SERVER_NO_RCON);
        const serverInfo = client.sendRaw('getinfo');
        await expect(client.getServerStatus()).resolves.toMatchObject({
            status: {
                sv_allowdownload: '0',
                g_matchmode: '0',
                g_gametype: '7',
                sv_maxclients: '32',
                sv_floodprotect: '2',
                capturelimit: '10',
                sv_hostname: '[b00bs] EURO Uptown CTF',
                auth_status: 'public',
                g_modversion: '4.3.4'
            },
            players: [
                { name: 'dasfg', points: 53, ping: 250 },
                { name: 'W DAS dasf dfyyy', points: 54, ping: 150 },
                { name: 'Mr.assyssqw', points: 48, ping: 123 },
                { name: 'ac', points: 63, ping: 53 },
                { name: 'HAUPTSACHE', points: 51, ping: 153 },
                { name: 'IHM GEHTS GUT', points: 36, ping: 262 }
            ]
        });
    })
})

describe('online', () => {
    const client = new IOQ3Rcon(WORKING_SERVER_WITH_RCON);

    test('rcon status', async () => {
        await expect(client.sendRcon('status')).resolves.toMatch(RCON_STATUS_VERIFY_REGEX)
    })

    test('ratelimiting', async () => {
        for(let i = 0; i < 20; i++) {
            await expect(client.sendRcon('status')).resolves.toMatch(RCON_STATUS_VERIFY_REGEX)
        }
    })

    test('variables', async () => {
        await client.sendRcon('map ut4_casa');
        await expect(client.getVarValue('mapname')).resolves.toMatchObject({
            name: 'mapname',
            value: 'ut4_casa'
        })

        await client.sendRcon('g_gravity 900');
        await expect(client.getVarValue('g_gravity')).resolves.toMatchObject({
            name: 'g_gravity',
            value: '900',
            default: '800'
        })

        await client.sendRcon('g_gravity 800');
        await expect(client.getVarValue('g_gravity')).resolves.toMatchObject({
            name: 'g_gravity',
            value: '800',
            default: '800'
        })
    })
})

function mockIOQ3Rcon(newSend) {
    jest.resetModules();
    jest.mock('../src/utils/udpclient', () => ({
        send: newSend
    }));
    IOQ3Rcon = require('../src').default
}

function unmockIOQ3Rcon() {
    jest.resetModules();
    jest.unmock('../src/utils/udpclient');
    IOQ3Rcon = require('../src').default
}