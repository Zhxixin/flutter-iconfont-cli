const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  // 更改入口文件为你的 TypeScript 入口文件
  entry: './src/index.ts',
  
  // 配置打包后文件的输出路径和文件名
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
  
  // 告诉 webpack 在打包时，如何处理不同类型的文件
  module: {
    rules: [
      {
        test: /\.ts$/, // 正则表达式匹配以 .ts 结尾的文件
        use: 'ts-loader', // 对匹配的文件使用 ts-loader
        exclude: /node_modules/, // 排除 node_modules 目录
      },
    ],
  },
  
  // 解析模块时，自动识别 .ts 文件
  resolve: {
    extensions: ['.ts', '.js'],
  },

  target: 'node',
  externals: [nodeExternals()],
};