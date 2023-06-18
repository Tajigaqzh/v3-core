export const objectToString = Object.prototype.toString

export const toTypeString = (value: unknown): string =>
    objectToString.call(value)

export const isObject = (val: unknown): val is Record<any, any> =>
    val !== null && typeof val === 'object'

export const isString = (val: unknown): val is string => typeof val === 'string'

export const isArray = Array.isArray

export const isDate = (val: unknown): val is Date =>
    toTypeString(val) === '[object Date]'

export const isRegExp = (val: unknown): val is RegExp =>
    toTypeString(val) === '[object RegExp]'

export const isFunction = (val: unknown): val is Function =>
    typeof val === 'function'

export const isMap = (val: unknown): val is Map<any, any> =>
    toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
    toTypeString(val) === '[object Set]'

export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'


export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

export const extend = Object.assign

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
    val: object,
    key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

// p判断数组的key是不是整数
export const isIntegerKey = (key: unknown) =>
    isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key

export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue)

export const NOOP = () => {}


