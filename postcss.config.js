export default (ctx) => ({
  plugins: {
    'postcss-import': {},
    autoprefixer: {
      overrideBrowserslist: ['> 0.5%', 'last 2 versions', 'not dead', 'not IE 11'],
    },
    ...(ctx.env === 'production'
      ? { cssnano: { preset: ['default', { discardComments: { removeAll: true } }] } }
      : {}),
  },
});
