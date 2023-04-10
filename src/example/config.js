module.exports = {
  /** 修改 mock 文件时重启服务的防抖时间 */
  watchDebounceTime: 1000,
  /** 日志是否格式化响应的json数据 */
  parseJSON: false,
  /** 正向代理地址 */
  server: 'localhost:4200',
  /** 目标地址 */
  proxy: {
    '/api': {
      target: 'https://zzp-dog.github.io/',
      changeOrigin: true,
      rewrite: url => url,
    },
  },
};
