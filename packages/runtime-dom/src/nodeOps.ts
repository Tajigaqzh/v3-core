//操作节点  增  删 改 查  元素  和文本

export const nodeOps = {
	//创建元素  createElement  注意 ：vue  runtime-dom  =>平台
	createElement: (tagName) => document.createElement(tagName),
	remove: (child) => {
		//删除
		let parent = child.parentNode;
		if (parent) {
			parent.removeChild(child);
		}
	},
	insert: (child, parent, ancher = null) => {
		//插入
		parent.insertBefore(child, ancher); // ancher = null appendchild
	},
	querySelector: (slect) => document.querySelector(slect),
	setElementText: (el, text) => {
		el.textContent = text;
	},

	// 文本
	createText: (text) => document.createTextNode(text),
	setText: (node, text) => (node.nodeValue = text),
};
