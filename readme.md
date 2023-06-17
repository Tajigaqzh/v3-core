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

```json
 "buildOptions": {
    "name": "vue-reactively",
    "formats": [
      "esm-bundler",
      "cjs",
      "global"
    ],
    "sourcemap": true
  }
```


##  commitlint

|类型	|描述|
|:---|:---|
|build	|编译相关的修改，例如发布版本、对项目构建或者依赖的改动|
|chore|	其他修改, 比如改变构建流程、或者增加依赖库、工具等|
|ci|	持续集成修改|
|docs|	文档修改|
|feat|	新特性、新功能|
|fix|	修改bug|
|perf	|优化相关，比如提升性能、体验|
|refactor|	代码重构|
|revert|	回滚到上一个版本|
|style|	代码格式修改, 注意不是 css 修改|
|test|	测试用例修改|
