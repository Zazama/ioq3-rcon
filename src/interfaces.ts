export interface IStatusPlayer {
    name: string,
    points: number,
    ping: number
}

export interface IVariableValue {
    name: string,
    value: string,
    default?: string
}

export interface IConstructorParameters {
    address: string,
    port: number,
    rconPassword: string,
    rateLimitMs: number,
    timeoutMs: number
}