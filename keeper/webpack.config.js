const path = require('path')
const slsw = require('serverless-webpack')

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',

  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },

  performance: {
    hints: false,
  },

  devtool: false, // Remove source maps to save space

  externals: {
    // Keep these as external to reduce bundle size
    'aws-sdk': 'aws-sdk',
    '@aws-sdk/client-s3': '@aws-sdk/client-s3',
    canvas: 'canvas',
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: 'tsconfig.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
    clean: true,
  },

  // Ignore large files that aren't needed at runtime
  ignoreWarnings: [
    /Critical dependency/,
    /the request of a dependency is an expression/,
  ],
}
