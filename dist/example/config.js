"use strict";
module.exports = {
    watchDebounceTime: 1000,
    parseJSON: false,
    server: 'localhost:4200',
    proxy: {
        '/api': {
            target: 'https://zzp-dog.github.io/',
            changeOrigin: true,
            rewrite: function (url) { return url; },
        },
    },
};
