export const isObject = (val: unknown): val is Record<any, any> =>
    val !== null && typeof val === 'object'

export const isString = (val: unknown): val is string => typeof val === 'string'