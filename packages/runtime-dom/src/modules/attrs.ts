import {ComponentInternalInstance } from '@vue/runtime-core'
export const patchAttr = (
	el: Element,
	key: string,
	value: any,
	isSVG: boolean,
	instance?: ComponentInternalInstance | null
) => {
	if (value == null) {
		el.removeAttribute(key);
	} else {
		el.removeAttribute(key, value);
	}
};
