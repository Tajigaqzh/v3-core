// import {ComponentInternalInstance } from '@vue/runtime-core'
import {includeBooleanAttr, isSpecialBooleanAttr} from "@vue/shared";

export const xlinkNS = 'http://www.w3.org/1999/xlink'

export function patchAttr(
	el: Element,
	key: string,
	value: any,
	isSVG: boolean,
	// instance?: ComponentInternalInstance | null,
) {
		// note we are only checking boolean attributes that don't have a
		// corresponding dom prop of the same name here.
		const isBoolean = isSpecialBooleanAttr(key)
		if (value == null || (isBoolean && !includeBooleanAttr(value))) {
			el.removeAttribute(key)
		} else {
			el.setAttribute(key, isBoolean ? '' : value)
		}
}
// export const patchAttr = (
// 	el: Element,
// 	key: string,
// 	value: any,
// 	_isSVG: boolean,
// 	// instance?: ComponentInternalInstance | null
// ) => {
// 	if (value == null) {
// 		el.removeAttribute(key);
// 	} else {
// 		el.removeAttribute(key, value)
// 	}
// };

