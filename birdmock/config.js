"use strict";
module.exports = {
    // 修改 mock 文件时重启服务的防抖时间
    watchDebounceTime: 2000,
    // 日志是否格式化响应的json
    parseJSON: false,
    // birdmock服务（对于客户端源服务来说，通过birdmock开启的服务是第三方服务）
    server: 'localhost:4201',
    // 可选代理服务（可通过server服务代理到目标服务）
    proxy: {
        '/api': {
            target: 'http://127.0.0.1:4201',
            changeOrigin: true,
            rewrite: function (url) { return url; },
        },
        '/ipa': {
            target: 'http://127.0.0.1:4202',
            changeOrigin: true,
            rewrite: function (url) { return url; },
        },
    },
    // 可选跨域配置
    cors: {
        // 源服务，默认值：'*'
        origin: '*',
        // 允许的请求头字段，默认值：'*'
        headers: '*',
        // 允许的请求方法，默认值：'*'
        methods: '*',
        // 是否允许跨域携带 cookie
        // 如果需要跨域携带 cookie ，则上述默认值不能设置为'*'
        credentials: 'false',
    },
};
