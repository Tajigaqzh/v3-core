import { EMPTY_OBJ, isFunction, isObject, ShapeFlags } from "@vue/shared";

import { componentPublicInstance } from "./componentPublicInstance";
import { VNode } from "./vnode";
import { createAppContext } from "./apiCreateApp";
import { initProps } from "./componentProps";
import { reactive } from "@vue/reactivity";

export type Data = Record<string, unknown>;

const emptyAppContext = createAppContext();
let uid = 0;

/**
 * 创建组件实例
 * @param vnode
 */
export const createComponentInstance = (vnode: VNode) => {
	//此实例就是用来记录组件的属性相关信息的
	const instance = {
		uid: uid++,
		state: EMPTY_OBJ,
		isMounted: false, //默认没有挂载
		subTree: EMPTY_OBJ, //要渲染的子树
		vnode: vnode,
		update: null, //在instance上挂载update方法，让用户可以更新
		scope: EMPTY_OBJ,
		attrs: EMPTY_OBJ,
		props: EMPTY_OBJ,
		propsOptions: vnode.type.props || EMPTY_OBJ,
		proxy: EMPTY_OBJ,
		render: EMPTY_OBJ,
	};
	return instance;
};

/**
 * 启动组件给组件赋值
 * @param instance
 */
export const setUpComponent = (instance) => {
	const { props, type } = instance.vnode;
	initProps(instance, props);

    // 对于组件来说保存的不能是虚拟节点了，而是组件实例,复用组件实例
    instance.vnode.component = instance

	instance.proxy = new Proxy(instance, {
		get(target, key, receiver) {
			const { state, props } = target;
			if (state && key in state) {
				return state[key];
			} else if (key in props) {
				return props[key];
			}
			let getter = publicProperties[key];
			if (getter) {
				return getter(instance);
			}
		},
		set(target, key, value, receiver) {
			const { state, props } = target;
			if (state && key in state) {
				state[key] = value;
				return true;
			} else if (key in props) {
				console.warn("props 不能修改！！！");
				return false;
			}
		},
	});

	let { data, render } = type;
	if (isFunction(data)) {
		instance.state = reactive(data.call(instance.proxy));
	}

	instance.render = render;
};

/**
 * 处理attrs和slots
 */
const publicProperties = {
	$attrs: (i) => i.attrs, //不是响应式的但是可以通过函数实现更新
};
//处理setup
// function setUpStateComponent(instance) {
//     //代理
//     instance.proxy = new Proxy(instance.ctx, componentPublicInstance as any)
//     //1获取组件的类型拿到组件setup方法   参数（props,coentxt）  返回值 (对象，函数)
//     let Component = instance.type
//     let { setup } = Component
//     //看一下这个组件有没有 setup  render
//     if (setup) {
//         //处理参数
//         let setupContext = crateConentext(instance) //对象
//         let setupResult = setup(instance.props, setupContext)
//         // 问题 setup 返回值  1 对象  2 函数
//         handlerSetupResult(instance, setupResult) // 如果是对象 就是值   如果是函数 就是render

//     } else { //没有setup
//         //调用render
//         finishComponentSetup(instance) //vnode.type
//     }
//     //    setup()

//     //render
//     Component.render(instance.proxy) // 处理render
// }
//处理setup的返回结果
function handlerSetupResult(instance, setupResult) {
	// 1 对象  2 函数
	if (isFunction(setupResult)) {
		//render
		instance.render = setupResult; //setup 返回的函数保存 到实例
	} else if (isObject(setupResult)) {
		instance.setupState = setupResult;
	}
	//做render
	finishComponentSetup(instance);
}
//处理render
function finishComponentSetup(instance) {
	//判断一下 组件中有没有这个render
	let Component = instance.type;
	if (!instance.render) {
		//没有

		if (!Component.render && Component.template) {
			//模板=>render
		}
		instance.render = Component.render;
	}
	// console.log( instance.render.toString())
}
//context
function crateConentext(instance) {
	return {
		attrs: instance.attrs,
		slots: instance.slots,
		emit: () => {},
		expose: () => {},
	};
}
