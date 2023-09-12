import { hasOwn } from "@vue/shared";

export const componentPublicIntance = {
    // {_:instance}
    // 拦截器，拦截get操作，使得可以通过proxy直接获取属性，proxy.name而不必proxy.props.name
    get({ _: instance }, key) {
        //获取值 props children  data
        const { props, data, setupState } = instance
        if(key[0]=="$"){ // 属性 $ 开头的不能获取
            return
        }
        if (hasOwn(props, key)) {
            return props[key]
        } else if (hasOwn(setupState, key)) {
            return setupState[key]
        }
    },
    set({ _: instance }, key, value) {
        const { props, data, setupState } = instance
       
        if (hasOwn(props, key)) {
           props[key] = value
        } else if (hasOwn(setupState, key)) {
            setupState[key] = value
        }
    }
}