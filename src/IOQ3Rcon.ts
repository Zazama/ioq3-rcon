import { buildConnectionlessBuffer } from './utils/packetbuilder'
import { send } from './utils/udpclient'
import { IConstructorParameters, IVariableValue, IStatusPlayer } from './interfaces'

const STATUS_PLAYER_REGEX = /([\d]+) ([\d]+) "(.*)"$/;
const IOQ3_RATE_LIMIT_MS = 150;

export default class IOQ3Rcon {
    private address: string;
    private port: number;
    private rconPassword: string;
    private rateLimitMs: number;
    private timeoutMs: number;

    constructor(opts: IConstructorParameters) {
        this.address = opts.address;
        this.port = opts.port;
        this.rconPassword = opts.rconPassword ?? "";
        this.rateLimitMs = opts.rateLimitMs ?? IOQ3_RATE_LIMIT_MS;
        this.timeoutMs = opts.timeoutMs ?? 8000;
    }

    public async getServerInfo() {
        const response = await send(buildConnectionlessBuffer('getinfo'), this.address, this.port, this.timeoutMs);
        const responseString = response.toString();
        if (!responseString.startsWith(buildConnectionlessBuffer('infoResponse').toString())) {
            throw 'bad response';
        }
        let responseArray = responseString
            .split('\n')[1]
            ?.split('\\') ?? [];
        if (responseArray.length === 0) {
            throw 'bad response';
        }
        /* Response string starts with \ so we don't consider the first one */
        responseArray.shift();
        return responseArray.reduce((prev, curr, index, arr) => {
            if (index % 2 !== 0) {
                prev[arr[index - 1]] = curr;
            }
            return prev;
        }, {});
    }

    public async getServerStatus() {
        const response = await send(buildConnectionlessBuffer('getstatus'), this.address, this.port, this.timeoutMs);
        const responseString = response.toString();
        if (!responseString.startsWith(buildConnectionlessBuffer('statusResponse').toString())) {
            throw 'bad response';
        }
        const responseArray = responseString.split('\n');
        if (responseArray.length < 2) {
            throw 'bad response';
        }

        let statusArray = responseArray[1].split('\\');
        /* Response string starts with \ so we don't consider the first one */
        statusArray.shift();
        const status = statusArray.reduce((prev, curr, index, arr) => {
            if (index % 2 !== 0) {
                prev[arr[index - 1]] = curr;
            }
            return prev;
        }, {});

        const players = responseArray.reduce<IStatusPlayer[]>((prev, curr, index) => {
            if(index > 1) {
                const parsed = curr.match(STATUS_PLAYER_REGEX);
                if(parsed && parsed.length === 4) {
                    prev.push({
                        points: parseInt(parsed[1]),
                        ping: parseInt(parsed[2]),
                        name: parsed[3],
                    });
                }
            }
            return prev;
        }, []);

        return {status, players};
    }

    public async sendRaw(command: string) {
        const response = await send(buildConnectionlessBuffer(command), this.address, this.port, this.timeoutMs);

        await new Promise(resolve => setTimeout(resolve, this.rateLimitMs));

        return response;
    }

    public async send(command: string) {
        const response = await this.sendRaw(command);

        return (response && response.length > 4) ? response.toString().substring(4) : '';
    }

    public async sendRconRaw(command: string) {
        if(!this.rconPassword) {
            throw new Error('missing rcon password');
        }
        return this.sendRaw(`rcon ${this.rconPassword} ${command}`);
    }

    public async sendRcon(command: string) {
        if(!this.rconPassword) {
            throw new Error('missing rcon password');
        }
        return this.send(`rcon ${this.rconPassword} ${command}`);
    }

    public async getVarValue(variable: string): Promise<IVariableValue> {
        if(variable.indexOf(' ') !== -1) throw 'not a variable';

        const response: string = await this.sendRcon(variable);

        /* Value is already default or there is no default */
        let defaultMatch = response.match(new RegExp(`"${variable}" is:"([^"]*?)"(?:$|, the default)`, 'm'));
        if(defaultMatch !== null && defaultMatch.length === 2) {
            let cleanedValue = defaultMatch[1].endsWith('^7') ? defaultMatch[1].substring(0, defaultMatch[1].length - 2) : defaultMatch[1]
            return {
                name: variable,
                value: cleanedValue,
                default: response.endsWith('"') ? undefined : cleanedValue
            }
        }

        /* Value is not default */
        let customMatch = response.match(new RegExp(`"${variable}" is:"([^"]*?)" default:"([^"]*?)"`));
        if(customMatch !== null && customMatch.length === 3) {
            let cleanedValue = customMatch[1].endsWith('^7') ? customMatch[1].substring(0, customMatch[1].length - 2) : customMatch[1]
            let cleanedDefault = customMatch[2].endsWith('^7') ? customMatch[2].substring(0, customMatch[2].length - 2) : customMatch[2]
            return {
                name: variable,
                value: cleanedValue,
                default: cleanedDefault
            }
        }
    }
}