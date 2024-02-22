import {isArray, isObject} from "@vue/shared";
import { isVnode, createVNode } from './vnode'

export function h(type: any, propsOrChildren?: any, children?: any) { //变成 vnode
    //参数
    const i = arguments.length //获取到参数的个数

    if (i == 2) {
        //这个 元素  + 属性   元素 + chldren
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) { //h('div',{})
            if (isVnode(propsOrChildren)) { //h('div',h('div'))  特殊
                return createVNode(type, null, [propsOrChildren])
            }
            // props without children
            return createVNode(type, propsOrChildren)//没有儿子
        } else {
            //就是儿子，没属性
            return createVNode(type, null, propsOrChildren)
        }
    } else {
        // h('div',{},'1','2','3')
        if (i > 3) {
            children = Array.prototype.slice.call(arguments, 2)
        } else if (i === 3 && isVnode(children)) { //h('div',{}，h('div')) 
            children = [children]
        }
        return createVNode(type, propsOrChildren, children)
    }

}

// 将这元素渲染到页面  => dom  
  
