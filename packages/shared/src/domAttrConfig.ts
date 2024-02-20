import {makeMap} from "./makeMap";

const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`
export const isSpecialBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs)

/**
 * The full list is needed during SSR to produce the correct initial markup.
 */
export const isBooleanAttr = /*#__PURE__*/ makeMap(
    specialBooleanAttrs +
    `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,` +
    `inert,loop,open,required,reversed,scoped,seamless,` +
    `checked,muted,multiple,selected`,
)

/**
 * Boolean attributes should be included if the value is truthy or ''.
 * e.g. `<select multiple>` compiles to `{ multiple: '' }`
 */
export function includeBooleanAttr(value: unknown): boolean {
    return !!value || value === ''
}