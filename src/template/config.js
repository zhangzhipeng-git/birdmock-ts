module.exports = {
  /** 修改 mock 文件时重启服务的防抖时间 */
  watchDebounceTime: 1000,
  /** 日志是否格式化响应的json数据 */
  parseJSON: false,
  /** birdmock服务（对于客户端源服务来说，通过birdmock开启的服务是第三方服务） */
  server: 'localhost:4201',
  /** 可选代理服务（可通过server服务代理到目标服务） */
  proxy: {
    '/api': {
      target: 'https://127.0.0.1:4201',
      changeOrigin: true,
      rewrite: url => url,
    },
  },
  /** 可选跨域配置 */
  cors: {
    /** 源服务，默认值：'*' */
    origin: 'localhost:4200',
    /** 允许的请求头字段，默认值：'*' */
    headers: 'xxx,yyy,zzz',
    /** 允许的请求方法，默认值：'*' */
    methods: 'GET,POST',
    /** 允许携带cookie */
    credentials: 'true',
  },
};
