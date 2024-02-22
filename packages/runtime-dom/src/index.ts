import {
	CreateAppFunction,
	createRenderer,
	Renderer,
	RootRenderFunction,
} from "@vue/runtime-core";
import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProp";
import { extend, isFunction, isString } from "@vue/shared";

// 导出了
export * from "@vue/runtime-core";


import {Text,Fragment,Static,Comment} from "@vue/runtime-core";

// export type {Text,Fragment,Static,Comment}

//vue3 dom全部 操作

declare module "@vue/reactivity" {
	export interface RefUnwrapBailTypes {
		runtimeDOMBailTypes: Node | Window;
	}
}

// const renderOptionDom = extend({ patchProps }, nodeOps);
const rendererOptions = /*#__PURE__*/ extend({ patchProp }, nodeOps);


//懒加载
let renderer: Renderer<Element | ShadowRoot> | null = null;

function ensureRenderer() {
	return (
		renderer ||
		(renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
	);
}
//
// 内置渲染器，会自动传入domAPI
export const render = ((...args) => {
	ensureRenderer().render(...args);
}) as RootRenderFunction<Element | ShadowRoot>;


// 通过createApp 创建
export const createApp = ((...args) => {
    const app = ensureRenderer().createApp(...args)

    const { mount } = app
    app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
        const container = normalizeContainer(containerOrSelector)
        if (!container) return

        const component = app._component
        if (!isFunction(component) && !component.render && !component.template) {
            component.template = container.innerHTML
        }

        // clear content before mounting
        container.innerHTML = ''
        const proxy = mount(container, false)
        if (container instanceof Element) {
            container.removeAttribute('v-cloak')
            container.setAttribute('data-v-app', '')
        }
        return proxy
    }

    return app
}) as CreateAppFunction<Element>


// export const createApp = (rootComponent, rootProps) => {
//     // 有不同的平台  创建 createRender  渲染器
//     let app = createRender(renderOptionDom).createApp(rootComponent, rootProps) //高阶函数  { mount:}
//     let { mount } = app
//     app.mount = function (containerOrSelector: Element | ShadowRoot | string) { //"#app"
//         const container = normalizeContainer(containerOrSelector);
//         if (!container) return

//         //挂载组件
//         //先清空 自己的内容
//         const container2 = nodeOps.querySelector(container);
//         // container.innerHTML = ''
//         //将组件渲染的dom元素进行挂载
//         //
//         mount(container2)
//     }
//     return app
// }

/**
 * 标准化处理容器，让他便曾一个合法的元素
 * @param container
 */
function normalizeContainer(
	container: Element | ShadowRoot | string
): Element | null {
	if (isString(container)) {
		const res = document.querySelector(container);
		if (!res) {
			console.warn(`Failed to mount app: mount target selector returned null.`);
		}
		return res;
	}
	return container as any;
}

