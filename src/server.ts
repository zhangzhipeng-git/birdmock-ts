/*
 * File: server.ts
 * Project: @bigbigbird/mock
 * File Created: Monday, 10th April 2023 2:11:35 pm
 * Author: zhangzhipeng (1029512956@qq.com)
 * -----
 * Last Modified: Monday, 17th April 2023 2:48:40 pm
 * Modified By: zhangzhipeng (1029512956@qq.com>)
 * -----
 * Copyright 2019 - 2023
 */

import 'colors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import Mock from 'mockjs';
import qs from 'querystring';
import { gunzipSync } from 'zlib';
import { getLogger, Logger } from './log';
import { forEachFile } from './util';
import { Buffer } from 'buffer';
import multiparty from 'multiparty'; // 文件上传解析模块
import { DEFAULT_ROOT_PATH, UPLOAD_DIR } from '.';

enum RequestEnum {
  POST = 'POST',
  PUT = 'PUT',
  GET = 'GET',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
}

const LOCAL_REG = /localhost|127\.0\.0\.1/;
const DEFAULT_SERVER = 'localhost:4201';
const NOT_FOND = { code: 404, msg: '未找到注册的接口' };

class Server {
  /** 服务器 */
  server!: http.Server;
  /** birdmock相关文件根目录 */
  rootPath: string = '';
  /** birdmock配置项（配置文件和命令行合并后的配置） */
  config!: Config;
  /** mock数据（格式为键值对，键是接口地址） */
  mocks!: { [k: string]: any };
  /** 日志 */
  log!: Logger;

  constructor() {
    this.setRootPath();
    this.setConfig();
    this.setLog();

    this.createServer();
    this.startServer();
  }

  /**
   * 规范化链接
   * @param {string} url 链接
   */
  normalized(url: string) {
    if (!url) return '';
    if (url[url.length - 1] === '/') url = url.slice(0, -1);
    if (url.indexOf('://') < 0) return `http://${url}`;
    return url;
  }

  /**
   * 获取端口
   * @param {string} url 链接
   */
  getPort(url: string) {
    if (!url) return;
    if (!url.includes(':')) return 80;
    const arr = url.split(':');
    return arr[2] ? +arr[2] : arr[1] ? +arr[1] : 80;
  }

  /**
   * 判断是否代理到server
   * @param {string} host 目标请求主机
   * @param {string} server 本地服务
   */
  isProxy2Server(host: string, server: string) {
    if (!host || !server) return false;
    host = this.normalized(host);
    server = this.normalized(server);
    if (host === server) return true;

    if (LOCAL_REG.test(host) && LOCAL_REG.test(server)) {
      const hostPort = this.getPort(host);
      const serverPort = this.getPort(server);
      return hostPort === serverPort;
    }

    return false;
  }

  /**
   * 获取父进程传过来参数，路径集合
   */
  getPaths() {
    return process.argv.slice(2);
  }
  /**
   * 路径解析
   */
  resolve(...dir: string[]) {
    return path.resolve(process.cwd(), ...dir);
  }

  /**
   * 设置birdmock根目录
   */
  setRootPath() {
    this.rootPath = this.resolve(process.env.mockRootPath || DEFAULT_ROOT_PATH);
  }
  /**
   * 设置配置项
   */
  setConfig() {
    const configPath = this.getPaths()[0];
    const config = require(configPath) as Config;
    let {
      watchDebounceTime = 1000,
      server = DEFAULT_SERVER,
      parseJSON = false,
      proxy,
    } = config;

    const {
      parseJSON: cmdParseJSON,
      server: cmdServer,
      target,
      rewrite,
      changeOrigin,
    } = process.env;

    if (target) {
      let arr = [''];
      // '^/api':'/xxx/'，将以api开头的接口代理到target，并将api重写为xxx
      if (rewrite) arr = rewrite.replace(/'/g, '').split(':');
      if (!proxy) proxy = {};
      proxy[arr[0]] = {
        changeOrigin: changeOrigin === 'true',
        target,
        rewrite: url =>
          !rewrite || rewrite.indexOf(':') < 0
            ? url
            : url.replace(new RegExp(arr[0]), arr[1]),
      };
    }

    if (proxy) {
      Object.keys(proxy).forEach((k: string) => {
        const p = proxy![k];
        p.target = this.normalized(p.target);
      });
    }

    this.config = {
      watchDebounceTime,
      parseJSON:
        cmdParseJSON !== undefined ? cmdParseJSON === 'true' : parseJSON,
      server: this.normalized(cmdServer || server),
      proxy,
    };
  }
  /**
   * 设置mock数据
   */
  setMocks() {
    if (!!this.mocks) return;
    const mocksPath = this.getPaths()[1];
    const mocks = {};
    forEachFile(mocksPath, file => {
      try {
        if (file.indexOf('.js') < 0) return;
        const mock = require(file);
        Object.assign(mocks, mock);
      } catch (e) {
        console.log(
          `${'文件'.yellow}${'['.green}${file.red}${']'.green}${
            '注册mock失败'.yellow
          }\r\n原因\r\n${e}`
        );
      }
    });
    this.mocks = mocks;
  }
  /**
   * 设置 log
   */
  setLog() {
    const logsPath = this.getPaths()[2];
    this.log = getLogger(logsPath);
  }
  /**
   * 预期请求类型
   */
  expectRequestType(
    req: http.IncomingMessage,
    type: 'json' | 'upload' | 'generic'
  ) {
    let contentType;
    switch (type) {
      case 'generic':
        contentType = 'application/x-www-form-urlencoded';
        break;
      case 'upload':
        contentType = 'multipart/form-data';
        break;
      case 'json':
        contentType = 'application/json';
        break;
    }
    return req.headers['content-type']!.indexOf(contentType) > -1;
  }

  /**
   * 获取接口地址，去掉后面的查询参数
   * @param {http.IncomingMessage} req 请求体
   */
  getApi(req: http.IncomingMessage) {
    return req.url?.split('?')[0] ?? '';
  }

  /**
   * 寻找mocks文件夹下，js文件中已经注册的接口地址
   * @param {string[]} keys mock 建集合
   * @param {string} api 接口地址
   * @returns {string} mock 键
   */
  getMatchKey(keys: string[], api: string) {
    if (api.indexOf('?') > -1) api = api.split('?')[0];
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
   * 开启跨域
   */
  enableCORS(res: http.ServerResponse) {
    const { cors } = this.config;
    if (!cors) return;
    res.setHeader('Access-Control-Allow-Origin', cors.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', cors.headers || '*');
    res.setHeader('Access-Control-Allow-Methods', cors.methods || '*');
    res.setHeader(
      'Access-Control-Allow-Credentials',
      (cors.credentials || true) + ''
    );
  }

  /**
   * 处理本地请求
   * @param {http.IncomingHttpHeaders} req 请求
   * @param {http.ServerResponse} res 响应
   */
  handleLocalServerRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    req.on('error', e => {
      this.log.error(e);
      res.end(JSON.stringify(e));
    });

    let params,
      rawData = '',
      method = req.method;
    switch (method) {
      case RequestEnum.POST:
      case RequestEnum.PUT:
        if (this.expectRequestType(req, 'upload')) {
          this.handleLocalUpload(req, res, params);
          return;
        }
        req.setEncoding('utf-8');
        req.on('data', chunk => {
          rawData += chunk;
        });
        req.on('end', () => {
          if (this.expectRequestType(req, 'json')) params = JSON.parse(rawData);
          else if (this.expectRequestType(req, 'generic'))
            params = qs.parse(rawData);
          else params = rawData;
        });
        break;
      case RequestEnum.GET:
      case RequestEnum.DELETE:
      case RequestEnum.OPTIONS:
      default:
        params = qs.parse(req.url?.split('?')[1] ?? '');
        break;
    }
    this.localServerResponse(req, res, params);
  }

  /**
   * 处理代理请求
   * @param {http.IncomingHttpHeaders} req 请求
   * @param {http.ServerResponse} res 响应
   */
  handleProxyServerRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    req.on('error', e => {
      this.log.error(e);
      res.end(JSON.stringify(e));
    });

    const { proxy } = this.config;
    if (!proxy) return;

    const api = this.getApi(req);
    // 检测是否匹配到proxy配置
    const apiKeys = Object.keys(proxy);
    const apiKey = apiKeys.find((k: string) => {
      return new RegExp(k).test(api);
    });
    if (!apiKey) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json;charset=utf-8');
      res.end(JSON.stringify(NOT_FOND));
      return;
    }

    const { changeOrigin, rewrite, target } = proxy[apiKey];
    const arr = target.split(':');
    // 默认http协议
    const protocol = arr[0];
    const hostname = arr[1].substring(2, arr[1].length);
    const method = req.method;
    const port = arr[2] ? +arr[2] : 80;

    if (changeOrigin)
      req.headers.host = `${hostname}${port != 80 ? ':' + port : ''}`;
    if (!req.headers['content-type'])
      req.headers['content-type'] =
        'application/x-www-form-urlencoded;charset=UTF-8';

    const options = {
      headers: req.headers,
      protocol: `${protocol}:`,
      port,
      hostname,
      path: rewrite ? rewrite(req.url ?? '') : req.url,
      method,
    };

    const httpX = arr[0] === 'https' ? https : http;

    let params,
      rawData = '';
    switch (method) {
      case RequestEnum.POST:
      case RequestEnum.PUT:
        req.on('data', chunk => {
          rawData += chunk;
        });
        req.on('end', () => {
          if (this.expectRequestType(req, 'json')) params = JSON.parse(rawData);
          else if (this.expectRequestType(req, 'generic'))
            params = qs.parse(rawData);
          else params = rawData;
          this.proxyServerResponse(req, res, params, httpX, options);
        });
        return;
      case RequestEnum.GET:
      case RequestEnum.DELETE:
      case RequestEnum.OPTIONS:
      default:
        params = qs.parse(req.url!.split('?')[1]);
        this.proxyServerResponse(req, res, params, httpX, options);
        return;
    }
  }

  /**
   * 上传文件
   * @param {http.IncomingMessage} req 请求
   * @param {http.ServerResponse} res 响应
   * @param params ?
   */
  handleLocalUpload(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    params: any
  ) {
    const form = new multiparty.Form({
      uploadDir: this.resolve(this.rootPath, UPLOAD_DIR),
    });
    form.parse(req, (err: string, fields: string[], files: any[]) => {
      if (err)
        this.log.info(
          `[${req.headers['host']}] [${req.url}]${req.method}=>文件上传错误:\r\n${err}`
        );

      this.localServerResponse(req, res, { ...fields, ...files });
    });
  }

  /**
   * 本地服务响应
   * @param {http.IncomingMessage} req 请求
   * @param {http.ServerResponse} res 响应
   * @param {object} params 请求参数
   */
  localServerResponse(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    params: any
  ) {
    const { parseJSON } = this.config;

    this.log.info(
      `[${req.headers['host']}] [${req.url}]${
        req.method
      }=>请求参数:\r\n${JSON.stringify(
        params,
        undefined,
        parseJSON ? '\t' : undefined
      )}`
    );

    this.enableCORS(res);
    if (req.method === RequestEnum.OPTIONS) return res.end();
    const api = this.getApi(req);
    const key = this.getMatchKey(Object.keys(this.mocks), api);

    // 未找到注册的接口
    if (!key) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json;charset=utf-8');
      res.end(JSON.stringify(NOT_FOND));
      return;
    }

    let value = this.mocks[key];
    if (typeof value === 'function') value = value(params);

    setTimeout(() => {
      // 自定义响应状态码数据： {statusCode: 200, data: {...真正的响应数据}}
      if (value && value.statusCode) {
        res.statusCode = value.statusCode;
        value = value.data;
      }

      let isFile = true;
      const match = key.match(/\.(?:svg|jpg|jpeg|png|gif|wav|txt|css|html|js)/);
      if (match) {
        // 根据接口地址后缀来匹配，模拟返回文件流，如：http://localhost:4201/api/xxx.jpg
        const CT: any = {
          '.svg': 'image/svg+xml',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.wav': 'audio/wav',
          '.txt': 'text/plain;charset=utf-8',
          '.css': 'text/css;charset=utf-8',
          '.html': 'text/html;charset=utf-8',
          '.js': 'application/javascript',
        };
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
          value['Content-Type'] || 'application/octet-stream'
        );
        res.end(value.buffer); // buffer
      } else {
        // json 格式返回
        isFile = false;
        value = Mock.mock(value);
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.end(JSON.stringify(value)); // string
      }

      this.log.info(
        `[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` +
          (isFile
            ? value
            : JSON.stringify(value, undefined, parseJSON ? '\t' : undefined))
      );
    }, (value && value.timeout) || 0);
  }

  /**
   * 代理响应
   * @param {http.IncomingMessage} req 请求
   * @param {http.ServerResponse} res 响应
   * @param {object} params 请求参数
   * @param {http | https} httpX 协议
   * @param {object} options 请求头
   */
  proxyServerResponse(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    params: any,
    httpX: any,
    options: any
  ) {
    const { parseJSON, server } = this.config;

    if (this.isProxy2Server(req.headers.host || '', server)) {
      this.setMocks();
      this.localServerResponse(req, res, params);
      return;
    }

    this.log.info(
      `[${req.headers['host']}] [${req.url}]${
        req.method
      }=>请求参数:\r\n${JSON.stringify(
        params,
        undefined,
        parseJSON ? '\t' : undefined
      )}`
    );

    httpX
      .request(options, (res_: http.IncomingMessage) => {
        let buffer: any = [];
        // 这里不设置字符编码，默认是Buffer对象（nodejs官网api有说明）
        res_.on('data', function (chunk) {
          buffer.push(chunk);
        });
        res_.on('end', () => {
          buffer = Buffer.concat(buffer);
          res.setHeader('Content-Type', res_.headers['Content-Type'] ?? '');
          // CORS
          this.enableCORS(res);
          res.statusCode = res_.statusCode || res.statusCode;
          res.end(buffer);

          // 以下流程仅用于日志打印
          let resStr,
            bf = buffer;
          // 如果是gzip压缩的，需要解压一下
          if ((res_.headers['content-encoding'] || '').indexOf('gzip') > -1)
            bf = gunzipSync(buffer);
          resStr = bf.toString('utf-8');

          try {
            const obj = JSON.parse(resStr);
            this.log.info(
              `[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` +
                JSON.stringify(obj, void 0, parseJSON ? '\t' : void 0)
            );
          } catch (e) {
            console.log('对方返回了非json格式数据~'.red.bold);
            this.log.info(
              `[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` +
                buffer
            );
          }
        });
      })
      .end()
      .on('error', (e: Error) => {
        this.log.error(e);
        res.end(JSON.stringify(e));
      });
  }

  createServer() {
    const { proxy, server } = this.config;
    let hp = http as ANY;
    let args = [];

    if (server && server.indexOf('https') > -1) {
      const options = {
        key: fs.readFileSync(path.resolve(process.cwd(), 'cert/server.key')),
        cert: fs.readFileSync(path.resolve(process.cwd(), 'cert/server.crt')),
      };
      args.push(options);
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      hp = https;
    }

    if (!proxy) {
      this.setMocks();
      args.push(this.handleLocalServerRequest.bind(this));
      this.server = hp.createServer(...args);
      return;
    } else {
      args.push(this.handleProxyServerRequest.bind(this));
      this.server = hp.createServer(...args);
    }
  }

  /**
   * 启动服务
   */
  startServer() {
    const { server = DEFAULT_SERVER, proxy } = this.config;
    const arr = server.split(':');
    if (!arr[0]) return;
    let port = arr[2] ? +arr[2] : arr[1] ? +arr[1] : 80;

    this.server.listen(port, () => {
      if (!proxy) {
        const mocksCount = Object.keys(this.mocks).length;
        console.log(
          '='.repeat(5).rainbow.bold.toString() +
            '本地模式已启动'.green.bold +
            `{ proxy => ${server} } { 接口数量:${mocksCount} }`.yellow +
            '='.repeat(5).rainbow.bold
        );
        return;
      } else {
        console.log(
          '='.repeat(5).rainbow.bold.toString() +
            `代理模式已启动`.green.bold +
            '='.repeat(5).rainbow.bold
        );
        Object.keys(proxy).forEach(k => {
          console.log(`{ ${k} => ${proxy[k].target} }`.yellow);
        });
      }
    });
    this.server.on('error', e => {
      console.error(e);
      process.exit(0);
    });

    process.on('SIGTERM', () => this.server.close(() => process.exit(0)));
  }
}

try {
  new Server();
} catch (e) {
  console.error(e);
  process.exit(0);
}
