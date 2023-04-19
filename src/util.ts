/*
 * File: util.ts
 * Project: @bigbigbird/mock
 * File Created: Thursday, 6th April 2023 4:09:48 pm
 * Author: zhangzhipeng (1029512956@qq.com)
 * -----
 * Last Modified: Monday, 17th April 2023 2:48:51 pm
 * Modified By: zhangzhipeng (1029512956@qq.com>)
 * -----
 * Copyright 2019 - 2023
 */

import fs from 'fs';
import os from 'os';

/**
 * 获取本机ip
 */
function getIPAdress() {
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; iface && i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === 'IPv4' &&
        alias.address !== '127.0.0.1' &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
}

/**
 * 遍历文件
 * @param {*} path 文件/文件夹
 * @param {*} callback 回调函数
 */
function forEachFile(path: string, callback: (path: string) => void) {
  if (path.endsWith('svn') || path.endsWith('git')) {
    return;
  }
  var stat = fs.statSync(path);
  if (stat.isDirectory()) {
    var files = fs.readdirSync(path);
    files.forEach(ele => {
      forEachFile(path + '/' + ele, callback);
    });
    return;
  }
  callback(path);
}

/**
 * 返回防抖函数
 * @param {*} f 目标函数
 * @param {*} t 防抖时延
 * @param {*} c 上下文
 */
function debounce(f: () => void, t: number, c?: unknown) {
  var timer: NodeJS.Timeout;
  return function (...args: any) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => f.apply(c, args), t);
  };
}

export { forEachFile, debounce, getIPAdress };
