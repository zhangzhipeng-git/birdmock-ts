/** 目标服务配置 */
declare interface Proxy {
  [k: string]: {
    /** 目标服务 */
    target: string;
    /** 是否改变本机源服务 */
    changeOrigin?: boolean;
    /** 请求地址重写规则 */
    rewrite?: (url: string) => string;
  };
}

/** 跨域响应配置 */
declare interface CORS {
  /** 源服务 */
  origin: string;
  /** 允许的请求头字段 */
  headers: string;
  /** 允许的请求方法 */
  methods: string;
  /** 允许携带cookie */
  credentials: boolean;
}

/** 服务配置 */
declare interface Config {
  /** watch 文件修改防抖时间 */
  watchDebounceTime?: number;
  /** 日志是否开启json格式化 */
  parseJSON?: boolean;
  /** 跨域配置 */
  cors?: CORS;
  /** 正向代理服务，默认（localhost:4201） */
  server: string;
  /** 目标服务集合，用匹配接口的正则来作为建，如 '^api/' */
  proxy?: Proxy;
}

declare module 'multiparty';

declare type ANY = any;
