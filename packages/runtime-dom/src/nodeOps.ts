//操作节点  增  删 改 查  元素  和文本

import { RendererOptions } from "@vue/runtime-core";

export const svgNS = "http://www.w3.org/2000/svg";
export const mathmlNS = "http://www.w3.org/1998/Math/MathML";

// 创建template
const templateContainer = document && /*#__PURE__*/ document.createElement('template')

export const nodeOps: Omit<RendererOptions<Node, Element>, "patchProp"> = {
	//创建元素  createElement  注意 ：vue  runtime-dom  =>平台
	createElement: (tag, namespace, is, props): Element => {
		const el =
			namespace === "svg"
				? document.createElementNS(svgNS, tag)
				: namespace === "mathml"
				? document.createElementNS(mathmlNS, tag)
				: document.createElement(tag, is ? { is } : undefined);

		if (tag === "select" && props && props.multiple != null) {
			(el as HTMLSelectElement).setAttribute("multiple", props.multiple);
		}

		return el;
	},
	remove: (child) => {
		let parent = child.parentNode;
		if (parent) {
			parent.removeChild(child);
		}
	},
	insert: (child, parent, anchor = null) => {
		parent.insertBefore(child, anchor || null); // ancher = null appendchild
	},
	querySelector: (slect) => document.querySelector(slect),
	setElementText: (el, text) => {
		el.textContent = text;
	},

	// 文本
	createText: (text) => document.createTextNode(text),
	setText: (node, text) => (node.nodeValue = text),

	createComment: (text) => document.createComment(text),

	nextSibling: (node) => node.nextSibling,

	parentNode: (node) => node.parentNode as Element | null,

	setScopeId(el, id) {
		el.setAttribute(id, "");
	},

	insertStaticContent(content, parent, anchor, namespace, start, end) {
		// <parent> before | first ... last | anchor </parent>
		const before = anchor ? anchor.previousSibling : parent.lastChild
		// #5308 can only take cached path if:
		// - has a single root node
		// - nextSibling info is still available
		if (start && (start === end || start.nextSibling)) {
		  // cached
		  while (true) {
			parent.insertBefore(start!.cloneNode(true), anchor)
			if (start === end || !(start = start!.nextSibling)) break
		  }
		} else {
		  // fresh insert
		  templateContainer.innerHTML =
			namespace === 'svg'
			  ? `<svg>${content}</svg>`
			  : namespace === 'mathml'
				? `<math>${content}</math>`
				: content
	
		  const template = templateContainer.content
		  if (namespace === 'svg' || namespace === 'mathml') {
			// remove outer svg/math wrapper
			const wrapper = template.firstChild!
			while (wrapper.firstChild) {
			  template.appendChild(wrapper.firstChild)
			}
			template.removeChild(wrapper)
		  }
		  parent.insertBefore(template, anchor)
		}
		return [
		  // first
		  before ? before.nextSibling! : parent.firstChild!,
		  // last
		  anchor ? anchor.previousSibling! : parent.lastChild!,
		]
	  },
};
