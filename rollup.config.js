import { createRequire } from 'module';
import path from 'path'
import { fileURLToPath } from 'url';
import json from '@rollup/plugin-json'
import resolvePlugin from '@rollup/plugin-node-resolve' //解析 第三方 插件
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

// 解决modulejs没有__dirname的问题
const require = createRequire(import.meta.url)
const __dirname = fileURLToPath(new URL(".", import.meta.url))

// 获取packages的路径
const packagesDir = path.resolve(__dirname, 'packages')

// 获取需要打包的包
const packageDir = path.resolve(packagesDir, process.env.TARGET)

//2.2 打包获取到 每个包的项目配置
const resolve = p => path.resolve(packageDir, p)

const pkg = require(resolve(`package.json`)) //获取 json

const name = path.basename(packageDir)
//3创建一个 表
const outputOpions = {
    "esm-bundler": {
        file: resolve(`dist/${name}.esm-bundler.js`),
        format: 'es'
    },
    "cjs": {
        file: resolve(`dist/${name}.cjs.js`),
        format: 'cjs'
    },
    "global": {
        file: resolve(`dist/${name}.global.js`),
        format: 'iife'
    }

}
// 获取每一个包的配置
const options = pkg.buildOptions

function createConfig(format, output) {
    //进行打包
    output.name = options.name
    output.sourcemap = true
    //生成rollup配置
    return {
        input: resolve('src/index.ts'), //导入
        output,
        plugins: [
            json(),
            terser(),
            typescript({ tsconfig:path.resolve(__dirname,"tsconfig.json")}),
            resolvePlugin() //解析 第三方 插件
        ]
    }
}
//rullup 需要 导出一个配置
// 分别打包"esm-bundler"(module),"cjs"(common),"global"(global)
export default options.formats.map(format => createConfig(format, outputOpions[format]))

