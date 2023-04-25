"use strict";
var fs = require('fs');
var path = require('path');
var resolve = function (p) { return path.resolve(__dirname, p); };
module.exports = {
    // 根据参数返回不同数据，并通过 delay 配置延迟响应时间，真正响应的是 data 对象
    '/example': function (params) {
        var id = params.id;
        if (id == 1) {
            // 延时3s返回
            return {
                delay: 3000,
                data: {
                    content: '我是示例mock返回的数据1',
                },
            };
        }
        else if (id == 2) {
            // 无延时返回
            return {
                content: '我是示例mock返回的数据2',
            };
        }
    },
    // 通配符匹配接口，并通过 delay 配置延迟响应时间，真正响应的是 data 对象
    '/api/*': function (params) {
        if (params === void 0) { params = {}; }
        return {
            delay: parseInt(params.delay),
            data: {
                mock: 'birdmock',
            },
        };
    },
    // 请求静态资源，带.xxx后缀
    '/static/test/bird.svg': function () {
        return fs.readFileSync(resolve('../assets/bird.svg'));
    },
    // 请求静态资源，不带.xxx后缀
    '/test/bird': function () {
        return {
            filename: 'bird.svg',
            buffer: fs.readFileSync(resolve('../assets/bird.svg')),
        };
    },
    // 上传文件
    '/upload/file': function (files) {
        console.log(files, '参数');
        var fileArr = files.file; // file 为formData的字段名
        var paths = [];
        fileArr.forEach(function (f) {
            var path = f.path;
            paths.push(path);
        });
        return {
            paths: paths,
        };
    },
    // 通过调用 nodejs 的请求和响应接口来响应请求
    '/diy/rawResponse': {
        rawResponse: function (req, res, requestParams) {
            res.setHeader('content-type', 'text/plain');
            res.end('Hello Word!');
        },
    },
};
