module.exports = {
  '/api/*': () => {
    return {
      status: 200,
      data: {
        mock: 'birdmock',
      },
    };
  },
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
  '/static/elyra/r-logo.svg': () => {
    return fs.readFileSync(resolve('./assets/r-logo.svg'));
  },
  '/elyra/pipeline/export': () => {
    return {
      filename: 'python.svg',
      buffer: fs.readFileSync(resolve('./assets/python.svg')),
    };
  },
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
};
