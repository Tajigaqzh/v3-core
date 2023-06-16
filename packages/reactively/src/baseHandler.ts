// 拦截器

import { Target } from "../types/reactiveType"

const get = /*#__PURE__ */ createGetter()//不是只读
const shallowGetter = /*#__PURE__ */ createGetter(false, true)//不是只读，浅层次
const readonlyGetter = /*#__PURE__ */ createGetter(true)//只读，非浅层
const shallowReadonlyGetter = /*#__PURE__ */ createGetter(true, true)//浅层且只读

export const reactiveHandlers: ProxyHandler<object> = {
    get,

}
export const readonlyHandlers: ProxyHandler<object> = {
    get: readonlyGetter
}

export const shallowReactiveHandlers: ProxyHandler<object> = {
    get: shallowGetter
}

export const shallowReadonlyHandlers: ProxyHandler<object> = {
    get: shallowReadonlyGetter
}



function createGetter(isReadonly = false, shallow = false) {
    return function get(target: Target, key: string | symbol, receiver: object) {
        const res = Reflect.get(target, key, receiver)
        if (!isReadonly) {

        }
    }
}