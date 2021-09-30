# ioq3-rcon

![GitHub package.json version](https://img.shields.io/github/package-json/v/zazama/ioq3-rcon?style=flat-square)
![Travis (.org)](https://img.shields.io/travis/zazama/ioq3-rcon?style=flat-square)
![npm](https://img.shields.io/npm/dt/ioq3-rcon?style=flat-square)

ioq3-rcon is a library for Urban Terror RCON protocol with some parsing functionality.

## Installation
```
npm install ioq3-rcon
```

## Usage

```javascript
import IOQ3Rcon from 'ioq3-rcon'

const client = new IOQ3Rcon({
    address: '127.0.0.1',
    port: 27960,
    // optional if only using info/status functions
    rconPassword: 'secret',
    // optional, wait time before next command can be executed
    rateLimitMs: 150,
    // optional, timeout for UDP packet
    timeoutMs: 8000
});
```

### Server info (no rcon)
```javascript
client.getServerInfo().then((result) => {
    // Can have more or less keywords depending on server's response
    /*result: {
            modversion: '4.3.4',
            game: 'q3ut4',
            auth: '1',
            pure: '1',
            gametype: '7',
            sv_maxclients: '22',
            bots: '0',
            clients: '0',
            mapname: 'ut4_uptown',
            hostname: '...',
            protocol: '68'
    }*/
})
```

### Server Status (no rcon)
```javascript
client.getServerStatus().then((result) => {
    // status keyword can have more or less sub-keywords depending on server's response
    /*{
        status: {
            sv_allowdownload: '0',
            g_matchmode: '0',
            g_gametype: '7',
            sv_maxclients: '32',
            sv_floodprotect: '2',
            capturelimit: '10',
            sv_hostname: '...',
            auth_status: 'public',
            g_modversion: '4.3.4'
        },
        players: [
            { name: 'dasfg', points: 53, ping: 250 },
            ...
        ]
    }*/
})
```

### RCON command
```javascript
client.sendRcon('status').then((result) => {
    // passes cleaned result string
})
```

### RCON get variable value
```javascript
client.getVarValue('mapname').then((result) => {
    /* result: {
            name: 'mapname',
            value: 'ut4_casa'
    } */
})

// if var has a default
client.getVarValue('g_gravity').then((result) => {
    /* result: {
            name: 'g_gravity',
            value: '900',
            default: '800'
    } */
})
```

### Other functions
- Use sendRconRaw(command) to get the original return buffer instead of cleaned string
- Use send(command) to specify your own command, returns cleaned string
- Use sendRaw(command) to specify your own command, returns original Buffer


## Throttling / Chaining commands
Please be aware that due to ioq3 rate limiting, you should chain your commands instead of executing them at the same time.

### Option 1: await
```javascript
await client.sendRcon('status')
await client.sendRcon('map ut4_casa')
// ...
await client.sendRcon('g_password abc')
```

### Option 2: chaining promises
```javascript
client.sendRcon('status')
    .then((statusResult) => {
        // do something with 'status' result
        return client.sendRcon('map ut4_casa')
    })
    .then((mapResult) => {
        // do something with map result
        return client.sendRcon('g_password abc')
    })
    .then((passwordResult) => {
        // do something with password result
    })
```
