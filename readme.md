# vue2缺点

ts支持不够好，所有属性都放在this实例上

大量的api挂载vue原型上treeshacking难以实现

跨平台不够友好

组合式api

虚拟dom重写，优化模板编译

monorepo介绍将多个package放在一个repo中管理

vue3中使用yarn workspace+lerna来管理项目

## 初始化和安装依赖

tsc --init
yarn add rollup rollup-plugin-typescript2 @rollup/plugin-node-resolve @rollup/plugin-json execa -D -W

execa解析子进程

# 自定义格式

 "buildOptions": {
    "name": "vue-reactively",
    "formats": [
      "esm-bundler",
      "cjs",
      "global"
    ],
    "sourcemap": true
  }
  
