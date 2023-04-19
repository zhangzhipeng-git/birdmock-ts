"use strict";
module.exports = {
    '/api/*': function () {
        return {
            status: 200,
            data: {
                mock: 'birdmock',
            },
        };
    },
    '/example': function (params) {
        if (params.id === 1) {
            return {
                status: 200,
                data: {
                    content: '我是示例mock返回的数据1',
                },
            };
        }
        else {
            return {
                status: 400,
                data: {
                    content: '我是示例mock返回的数据2',
                },
            };
        }
    },
    '/static/elyra/r-logo.svg': function () {
        return fs.readFileSync(resolve('./assets/r-logo.svg'));
    },
    '/elyra/pipeline/export': function () {
        return {
            filename: 'python.svg',
            buffer: fs.readFileSync(resolve('./assets/python.svg')),
        };
    },
    '/upload/file': function (files) {
        console.log(files, '参数');
        var fileArr = files.file;
        var paths = [];
        fileArr.forEach(function (f) {
            var path = f.path;
            paths.push(path);
        });
        return {
            paths: paths,
        };
    },
};
