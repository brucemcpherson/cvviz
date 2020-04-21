
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  filename: 'index.html',
  inject: 'body'
})
module.exports = { 
  entry: './src/index.js', 
  output: { 
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  }, 
  plugins: [
    HtmlWebpackPluginConfig
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  },
  module:{
    rules:[
        {
            test:/\.css$/,
            use:['style-loader','css-loader']
        }
   ]
  }
}

