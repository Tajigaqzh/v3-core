// h('div',{},[])
export const enum ShapeFlags {
    ELEMENT = 1,//1 元素
    FUNCTIONAL_COMPONENT = 1 << 1, // 00000010 //2  1*2^1 函数组件
    STATEFUL_COMPONENT = 1 << 2,   //00000100  //4  1*2^2 普通状态组件
    TEXT_CHILDREN = 1 << 3, // 00001000  //8   1*2^3 元素的儿子是文本
    ARRAY_CHILDREN = 1 << 4,//16 元素的儿子是数组
    SLOTS_CHILDREN = 1 << 5,//32 组件的插槽
    TELEPORT = 1 << 6,//64 传送门组件
    SUSPENSE = 1 << 7,//128 异步组件
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,//256 预缓存的组件
    COMPONENT_KEPT_ALIVE = 1 << 9,//512  缓存的组件
    //
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 00000100|00000010  concreate组件，未确定是函数组件还是状态组件
  }
  // 注意  1  二进制  一个bit  由8位组成 
  // 1<<1 向左位移1位  
  
  
  //组件   | 或
  //00000100 | 00000010  =》00000110  1或2 =》 1|2
  
  //判断是不是组件  位运算
  //00000110 // 6