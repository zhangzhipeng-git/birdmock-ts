/*
 * File: index.ts
 * Project: @bigbigbird/mock
 * File Created: Thursday, 6th April 2023 3:53:50 pm
 * Author: zhangzhipeng (1029512956@qq.com)
 * -----
 * Last Modified: Monday, 17th April 2023 2:48:08 pm
 * Modified By: zhangzhipeng (1029512956@qq.com>)
 * -----
 * Copyright 2019 - 2023
 */

import 'colors';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { debounce } from './util';

export const DEFAULT_ROOT_PATH = 'birdmock';

const CONFIG_FILE = 'config.js';
const CONFIG_FILE_TEMPLATE_PATH = './template/config.js';

const MOCKS_DIR = 'mocks';
const MOCKS_FILE_TEMPLATE = 'response.js';
const MOCKS_FILE_TEMPLATE_PATH = './template/response.js';

const LOGS_DIR = 'logs';

export const ASSETS_DIR = 'assets';
export const UPLOAD_DIR = 'upload';

const SERVER_FILE_PATH = './server.js';

export class ServerBoot {
  private static worker: child_process.ChildProcess;

  /**
   * 目录结构
   * birdmock
   *  -assets
   *  -upload
   *  -logs
   *    -xx.log
   *  -mocks
   *    -xx.mock.js
   *  -config.json
   */
  private static getPaths() {
    // birdmock路径
    const mockPath = path.resolve(
      process.cwd(),
      process.env.mockPath || DEFAULT_ROOT_PATH
    );
    if (!fs.existsSync(mockPath) || !fs.statSync(mockPath).isDirectory()) {
      fs.mkdirSync(mockPath);
    }

    // birdmock配置
    const configPath = path.resolve(mockPath, CONFIG_FILE);
    if (!fs.existsSync(configPath) || !fs.statSync(configPath).isFile()) {
      fs.copyFileSync(
        path.resolve(__dirname, CONFIG_FILE_TEMPLATE_PATH),
        configPath
      );
    }

    // mock数据文件路径
    const mocksPath = path.resolve(mockPath, MOCKS_DIR);
    if (!fs.existsSync(mocksPath) || !fs.statSync(mocksPath).isDirectory()) {
      fs.mkdirSync(mocksPath);
    }
    const templateFilePath = path.resolve(mocksPath, MOCKS_FILE_TEMPLATE);
    if (
      !fs.existsSync(templateFilePath) ||
      !fs.statSync(templateFilePath).isFile()
    )
      fs.copyFileSync(
        path.resolve(__dirname, MOCKS_FILE_TEMPLATE_PATH),
        templateFilePath
      );

    // 日志路径配置
    const logsPath = path.resolve(mockPath, LOGS_DIR);
    if (!fs.existsSync(logsPath) || !fs.statSync(logsPath).isDirectory()) {
      fs.mkdirSync(logsPath);
    }

    // 静态资源根路径
    const assetsPath = path.resolve(mockPath, ASSETS_DIR);
    if (!fs.existsSync(assetsPath) || !fs.statSync(assetsPath).isDirectory()) {
      fs.mkdirSync(assetsPath);
    }

    // 文件上传根路径
    const uploadPath = path.resolve(mockPath, UPLOAD_DIR);
    if (!fs.existsSync(uploadPath) || !fs.statSync(uploadPath).isDirectory()) {
      fs.mkdirSync(uploadPath);
    }

    // 服务路径
    const serverFilePath = path.resolve(__dirname, SERVER_FILE_PATH);
    return { serverFilePath, configPath, mocksPath, logsPath };
  }

  /**
   * 主进程监听mock服务子进程的退出，若非正常退出则重启子进程
   * @param {string[]} paths 服务路径，配置路径，mocks路径，logs路径
   */
  private static spawn(paths: string[]) {
    const worker = child_process.spawn('node', paths, {
      stdio: [process.stdin, process.stdout, process.stderr],
    });
    return worker;
  }

  /**
   * 返回监听文件修改时要调用的函数（防抖）
   * @param {string[]} paths 服务启动、 mock配置、mock数据及日志文件路径
   * @param {number} debounceTime 防抖时间
   */
  private static listener(paths: string[], debounceTime = 1000) {
    return debounce(() => {
      this.worker.kill();
      console.log('服务器重启中...'.yellow.bold);
      this.worker = this.spawn(paths);
    }, debounceTime);
  }

  public static main(...args: string[]): void {
    const { serverFilePath, configPath, mocksPath, logsPath } = this.getPaths();
    const paths = [serverFilePath, configPath, mocksPath, logsPath];
    const debounceTime = require(configPath).watchDebounceTime;

    this.worker = this.spawn(paths);
    this.worker.on('exit', (code, signal) => {
      // 正常退出不重启服务
      if (code === 0) return;
      // 正常终止不重启服务
      if (signal === 'SIGTERM') return;

      this.spawn(paths);
    });

    fs.watch(
      configPath,
      { encoding: 'utf8' },
      this.listener(paths, debounceTime)
    );
    fs.watch(
      mocksPath,
      { encoding: 'utf8', recursive: true },
      this.listener(paths, debounceTime)
    );

    process.on('SIGTERM', () => {
      this.worker.kill();
      process.exit(0);
    });
  }
}
