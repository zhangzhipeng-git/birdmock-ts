/*
 * Created Date: Saturday, August 22nd 2020, 11:09:54 pm
 * Author: 木懵の狗纸
 * ---------------------------------------------------
 * Description: birdmock本地服务（请求本地或代理转发）
 * ---------------------------------------------------
 * Last Modified: Sunday August 23rd 2020 11:16:15 pm
 * Modified By: 木懵の狗纸
 * Contact: 1029512956@qq.com
 * Copyright (c) 2020 ZXWORK
 */

var http = require('http'); // http模块
var https = require('https'); // https模块
var Mock = require('mockjs'); // mockjs
var qs = require('querystring'); // 查询参数工具
var { getLogger } = require('../log/log'); // 日志
var { forEachFile } = require('../util/util'); // 递归文件，获取本机ip
const { gunzipSync } = require('zlib');
const { Buffer } = require('buffer');
require('colors'); // 彩色字体

var multiparty = require('multiparty'); // 文件上传解析模块

var path = require('path');
var resolve = (...dir) => path.resolve(process.cwd(), ...dir);
var mockPath = resolve(process.env.mockPath || 'birdmock');


var paths = process.argv.slice(2);
var configPath = paths[0];
var mocksPath = paths[1];
var logsPath = paths[2];

/** 配置 */
var config = require(configPath);
var log4js = config.log4js;
var appenders = log4js.appenders;
var appenderKeys = Object.keys(appenders);
appenderKeys.forEach(key => {
  if (appenders[key].type === 'stdout') return;
  appenders[key].filename = logsPath + '/birdmock';
});
log = getLogger(log4js);

var apiContext = process.env.apiContext || config['localServerKey'] || '/api';
var localServer =
  process.env.localServer ||
  config.proxy[apiContext].target ||
  'http://localhost:4200';
var proxyServer = process.env.proxyServer || config['localServerProxy'];
// 为 true 时，才会将请求代理到 proxyServer
var forwardMode = process.env.forwardMode;
var parseJSON = process.env.parseJSON || config['parseJSON'];
var proxy = proxyServer;

// 本地端口
var localPort = Number(localServer.split(':')[2] || localServer.split(':')[1]);

/** mock数据 */
var mocks = {};
forEachFile(mocksPath, file => {
  try {
    if (file.indexOf('.js') < 0) return;
    var mock = require(file);
    Object.assign(mocks, mock);
  } catch (e) {
    console.log(
      '文件'.yellow +
        '['.green +
        file.red +
        ']'.green +
        `注册mock失败`.yellow +
        `\r\n原因：\r\n` +
        e
    );
  }
});

/**
 * 是否请求体类型为 JSON 格式
 * @param {object} req 请求对象
 */
function isJSONRequestBody(req) {
  return req.headers['content-type'].indexOf('application/json') > -1;
}

/**
 * 是否请求类型为 FormData 格式
 * @param {object} req 请求对象
 */
function isFormDataBody(req) {
  return req.headers['content-type'].indexOf('multipart/form-data') > -1;
}

/**
 * 是否请求类型为普通的请求，如 get 请求
 * @param {object} req 请求对象
 */
function isGenericQuery(req) {
  return (
    req.headers['content-type'].indexOf('application/x-www-form-urlencoded') >
    -1
  );
}

/** 本地服务器 */
var server;
(function () {
  if (!forwardMode) {
    // 本地模式
    server = http.createServer((req, res) => {
      var params;
      var rawData = '';
      var method = req.method;
      switch (method) {
        case 'POST':
        case 'PUT':
          if (isFormDataBody(req)) {
            var form = new multiparty.Form({
              uploadDir: resolve(mockPath, 'upload')
            });
            form.parse(req, (err, fields, files) => {
              /// request error log
              if (err)
                log.info(
                  `[${req.headers['host']}] [${req.url}]${req.method}=>文件上传错误:\r\n` +
                    err
                );
              /// request error log

              response(req, res, { ...fields, ...files });
            });
            return;
          }
          req.setEncoding('utf8');
          req.on('data', chunk => {
            rawData += chunk;
          });
          req.on('end', () => {
            let params;
            if (isJSONRequestBody(req)) params = JSON.parse(rawData);
            else if (isGenericQuery(req)) params = qs.parse(rawData);
            else params = rawData;
            response(req, res, params);
          });
          return;
        case 'GET':
        case 'DELETE':
        case 'OPTIONS':
        default:
          params = qs.parse(req.url.split('?')[1]);
          break;
      }
      response(req, res, params);
    });
    return;
  }
  // 代理转发请求模式
  server = http.createServer((req, res) => {
    var params;
    var method = req.method;
    var arr = proxy.split(':');
    var hostname = arr[1].replace(/\//g, '');
    var changeOrigin = proxyConfig.changeOrigin;
    // 不允许请求代理到来源
    if (proxy === req.headers.referer) {
      console.log('无法将源请求代理到源服务~'.red.bold);
      process.exit(0);
    }
    var options = {
      protocol: arr[0] + ':', // 协议
      hostname: hostname, // 主机
      path: req.url, // 请求接口
      method: method, // 请求方式
      headers: req.headers // 请求头
    };
    // 判断协议
    var httpX;
    if (arr[0] === 'https') {
      httpX = https;
    } else if (arr[0] === 'http') {
      httpX = http;
    }
    // 端口不为80
    if (arr.length === 3) {
      options.port = parseInt(arr[2]);
    }
    // 将请求头的host设为target的host
    var port = options.port;
    if (changeOrigin) {
      req.headers.host = hostname + (port ? ':' + port : '');
    }
    if (!req.headers['content-type']) {
      req.headers['content-type'] =
        'application/x-www-form-urlencoded;charset=UTF-8';
    }
    switch (method) {
      case 'POST':
      case 'PUT':
        var rawData = '';
        req.on('data', chunk => {
          rawData += chunk;
        });
        req.on('end', () => {
          let params;
          if (isJSONRequestBody(req)) params = JSON.parse(rawData);
          else if (isGenericQuery(req)) params = qs.parse(rawData);
          else params = rawData;
          proxyResponse(httpX, options, params, req, res);
        });
        return;
      case 'GET':
      case 'DELETE':
      case 'OPTIONS':
      default:
        params = qs.parse(req.url.split('?')[1]);
        break;
    }
    proxyResponse(httpX, options, params, req, res);
  });
})();

/**
 * 寻找mocks文件夹下，js文件中已经注册的接口地址
 * @param {string[]} keys mock 建集合
 * @param {string} url 接口地址
 * @returns {string} mock 键
 */
function getMatchKey(keys, api) {
  if (keys.includes(api)) return api;
  const genericKeys = keys.filter(k => k.indexOf('*') > -1);
  const arr1 = api.split('/');
  return (
    genericKeys.find(k => {
      const arr2 = k.split('/');
      return (
        arr1.length === arr2.length &&
        arr2.every((dir, i) => dir === '*' || dir === arr1[i])
      );
    }) || null
  );
}

/**
 * 本地模式响应
 * @param {*} req 请求
 * @param {*} res 响应
 * @param {*} params  请求对象
 */
function response(req, res, params) {
  /// request log
  log.info(
    `[${req.headers['host']}] [${req.url}]${req.method}=>请求参数:\r\n` +
      JSON.stringify(params, null, parseJSON ? '\t' : null)
  );
  /// request log

  res.setHeader('Content-Type', 'application/json;charset=utf-8');
  // cros
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') return res.end();

  if (localServer[localServer.length - 1] === '/') {
    localServer = localServer.slice(0, -1);
  }
  var api = req.url.split('?')[0].replace(localServer, '');
  var key = getMatchKey(Object.keys(mocks), api);

  // 未找到注册的接口
  if (!key) {
    res.statusCode = 404;
    res.end();
    return;
  }

  var value = mocks[key];
  // 如果 value为函数，则执行函数
  if (typeof value === 'function') {
    value = value(params);
  }

  setTimeout(() => {
    // 自定义响应状态码数据： {statusCode: 200, data: {...真正的响应数据}}
    if (value && value.statusCode) {
      res.statusCode = value.statusCode;
      value = value.data;
    }

    let isFile = true;
    var CT = {
      '.svg': 'image/svg+xml',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.wav': 'audio/wav',
      '.txt': 'text/plain;charset=utf-8',
      '.css': 'text/css;charset=utf-8',
      '.html': 'text/html;charset=utf-8',
      '.js': 'application/javascript'
    };
    const match = key.match(/\.(?:svg|jpg|jpeg|png|gif|wav|txt|css|html|js)/);

    if (match) {
      // 根据接口地址后缀来匹配，模拟返回文件流
      res.setHeader('Content-type', CT[match[0]]);
      res.end(value); // buffer
    } else if (value && value.buffer && value.buffer instanceof Buffer) {
      // 固定格式：{filename: xxx, buffer: xxx, 'Content-Type': xxx}，模拟返回文件流
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.setHeader(
        'Content-Disposition',
        `attachment;filename=${value.filename}`
      );
      res.setHeader(
        'Content-type',
        value['Contet-Type'] || 'application/octet-stream'
      );
      res.end(value.buffer); // buffer
    } else {
      // json 格式返回
      isFile = false;
      value = Mock.mock(value);
      res.end(JSON.stringify(value)); // string
    }

    /// response log
    log.info(
      `[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` +
        (isFile ? value : JSON.stringify(value, null, parseJSON ? '\t' : null))
    );
    /// response log
  }, (value && value.timeout) || 0);
}

/**
 * 本地代理响应
 * @param {*} httpX 协议
 * @param {*} options 请求体
 * @param {*} params 请求参数
 * @param {*} req 被代理的请求
 * @param {*} res 代理响应
 */
function proxyResponse(httpX, options, params, req, res) {
  /// request log
  log.info(
    `[${req.headers['host']}] [${req.url}]${req.method}=>请求参数:\r\n` +
      JSON.stringify(params, null, parseJSON ? '\t' : null)
  );
  /// request log

  var req_ = httpX.request(options, res_ => {
    var buffer = [];
    // 这里不设置字符编码，默认是Buffer对象（nodejs官网api有说明）
    res_.on('data', function (chunk) {
      buffer.push(chunk);
    });
    res_.on('end', function () {
      buffer = Buffer.concat(buffer);
      res.setHeader('Content-Type', res_.getHeader('Content-Type'));
      // cros
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.statusCode = res_.statusCode;
      res.end(buffer);

      var resStr;
      var bf = buffer;
      // 如果是gzip压缩的，需要解压以下
      if ((res_.headers['content-encoding'] || '').indexOf('gzip') > -1)
        bf = gunzipSync(buffer);
      resStr = bf.toString('utf-8');

      /// response log
      try {
        var obj = JSON.parse(resStr);
        log.info(
          `[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` +
            JSON.stringify(obj, null, parseJSON ? '\t' : null)
        );
      } catch (e) {
        console.log('对方返回了非json格式数据~'.red.bold);
        log.info(
          `[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` +
            buffer
        );
      }
      /// response log
    });
  });
  req_.end();
}

server.listen(localPort, err => {
  var mode;
  var target;
  if (!forwardMode) {
    // 本地代理转发模式
    mode = '本地模式';
    target = localServer;
  } else {
    mode = '代理模式';
    target = proxy;
  }
  console.log(
    '='.repeat(5).rainbow.bold +
      `${mode}已启动`.green.bold +
      `{ proxy => ${target} } { 接口数量:${Object.keys(mocks).length} }`
        .yellow +
      '='.repeat(5).rainbow.bold
  );
});

process.on('SIGKILL', function () {
  process.exit(0);
});
