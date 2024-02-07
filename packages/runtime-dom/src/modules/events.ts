// import { hyphenate } from "@vue/shared"

// type EventValue = Function | Function[]

// interface Invoker extends EventListener {
//     value: EventValue
//     attached: number
// }
// // 对于事件采用缓存
// export function patchEvent(el: Element & { _vei?: Record<string, Invoker | undefined> },
//     rawName: string,
//     prevValue: EventValue | null,
//     nextValue: EventValue | null,
//     instance = null) {
//     // 把所有事件缓存成一个对象放到el上
//     const invokers = el._vei || (el._vei = {})
//     const existingInvoker = invokers[rawName]
//     if (nextValue && existingInvoker) {
//         // patch
//         existingInvoker.value = nextValue
//     } else {
//         const [name, options] = parseName(rawName)
//     }
// }

// const optionsModifierRE = /(?:Once|Passive|Capture)$/
// function parseName(name: string): [string, EventListenerOptions | undefined] {
//     let options: EventListenerOptions | undefined
//     if (optionsModifierRE.test(name)) {
//       options = {}
//       let m
//       while ((m = name.match(optionsModifierRE))) {
//         name = name.slice(0, name.length - m[0].length)
//         ;(options as any)[m[0].toLowerCase()] = true
//       }
//     }
//     const event = name[2] === ':' ? name.slice(3) : hyphenate(name.slice(2))
//     return [event, options]
//   }

//事件
//div  @cilck='fn'   div @cilck="fn1" 
//一个元素的 绑定事件   addEventListener
//缓存 {click:fn1}  =>


export const patchEvent = (el, key, value) => {
    // 1对函数缓存
    const invokers = el._vei || (el._vei = {});
    const exists = invokers[key] //
    if (exists && value) {
        exists.value = value 
    } else {
        //获取事件名称  (1)新的有  （2）新的没有
        const eventName = key.slice(2).toLowerCase()
        if (value) { //新的有
            let invoker = invokers[eventName] = createInvoker(value)
            el.addEventListener(eventName, invoker)//添加事件
        } else {//没有   以前删除
            el.removeEventLister(eventName, exists)
            invokers[eventName] = undefined //清除缓存
        }
    }
}


function createInvoker(value) {
    const invoker = (e) => {
        invoker.value(e)
    }
    invoker.value = value
    return invoker
}

//  事件的处理

//1 给元素缓存一个绑定的事件列表
//2如果缓存中没有 ，并且value 有值 需要绑定方法并缓存掐了
//3以前绑定过 需要删除，缓存也缓存
//4 两个都有  直接改变invoker中的value 指向最新的事件