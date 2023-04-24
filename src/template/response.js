var fs = require('fs');
var path = require('path');
var resolve = p => path.resolve(__dirname, p);

module.exports = {
  // 根据参数返回不同数据
  '/example': params => {
    if (params.id === 1) {
      return {
        status: 200,
        data: {
          content: '我是示例mock返回的数据1',
        },
      };
    } else {
      return {
        status: 400,
        data: {
          content: '我是示例mock返回的数据2',
        },
      };
    }
  },
  // 通配符匹配接口
  '/api/*': () => {
    return {
      status: 200,
      data: {
        mock: 'birdmock',
      },
    };
  },
  // 请求静态资源，带.xxx后缀
  '/static/test/bird.svg': () => {
    return fs.readFileSync(resolve('../assets/bird.svg'));
  },
  // 请求静态资源，不带.xxx后缀
  '/test/bird': () => {
    return {
      filename: 'bird.svg',
      buffer: fs.readFileSync(resolve('../assets/bird.svg')),
    };
  },
  // 上传文件
  '/upload/file': files => {
    console.log(files, '参数');
    const fileArr = files.file; // file 为formData的字段名
    const paths = [];
    fileArr.forEach(f => {
      const path = f.path;
      paths.push(path);
    });

    return {
      paths,
    };
  },
  // 自定义响应流程
  '/diy/rawResponse': {
    rawResponse: (req, res, requestParams) => {
      res.setHeader('content-type', 'text/plain');
      res.end('Hello Word!');
    },
  },
};
