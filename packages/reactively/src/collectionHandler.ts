

type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type MapTypes = Map<any, any> | WeakMap<any, any>
type SetTypes = Set<any> | WeakSet<any>

type CollectionTypes = IterableCollections | WeakCollections

// export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
//     get: /*#__PURE__*/ createInstrumentationGetter(false, false),
//   }
  
//   export const shallowCollectionHandlers: ProxyHandler<CollectionTypes> = {
//     get: /*#__PURE__*/ createInstrumentationGetter(false, true),
//   }
  
//   export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
//     get: /*#__PURE__*/ createInstrumentationGetter(true, false),
//   }
  
//   export const shallowReadonlyCollectionHandlers: ProxyHandler<CollectionTypes> =
//     {
//       get: /*#__PURE__*/ createInstrumentationGetter(true, true),
//     }


// function createInstrumentationGetter(isReadonly: boolean, shallow: boolean){
//     const instrumentations = shallow
//     ? isReadonly
//       ? shallowReadonlyInstrumentations
//       : shallowInstrumentations
//     : isReadonly
//       ? readonlyInstrumentations
//       : mutableInstrumentations
// }