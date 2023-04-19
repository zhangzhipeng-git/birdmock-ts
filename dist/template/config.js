"use strict";
module.exports = {
    watchDebounceTime: 1000,
    parseJSON: false,
    server: 'localhost:4201',
    proxy: {
        '/api': {
            target: 'https://127.0.0.1:4201',
            changeOrigin: true,
            rewrite: function (url) { return url; },
        },
    },
    cors: {
        origin: 'localhost:4200',
        headers: 'xxx,yyy,zzz',
        methods: 'GET,POST',
        credentials: 'true',
    },
};
