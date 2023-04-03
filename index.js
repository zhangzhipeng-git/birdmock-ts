/*
 * Created Date: Saturday, August 22nd 2019, 11:09:54 pm
 * Author: 木懵の狗纸
 * ---------------------------------------------------
 * Description: birdmock服务入口
 * 利用webpack-dev-server将api请求转发到本地的一个服务，
 * 本地服务又可以将请求转发到指定的服务
 * ---------------------------------------------------
 * Last Modified: Saturday August 22nd 2020 11:21:02 pm
 * Modified By: 木懵の狗纸
 * Contact: 1029512956@qq.com
 * Copyright (c) 2020 ZXWORK
 */

var fs = require('fs');                       // 文件系统
var path  = require('path');                  // 路径解析
var {debounce}  = require('./util/util');     // 工具类
var child_process = require('child_process'); // 子进程相关工具
require('colors');                            // 多彩文字

/**
 * 目录结构
 * birdmock
 *  -logs
 *    -xx.log
 *  -mocks
 *    -xx.mock.js
 *  -config.json
 */

// birdmock路径
var mockPath = path.resolve(process.cwd(), process.env.mockPath || 'birdmock');
if (!fs.existsSync(mockPath) || !fs.statSync(mockPath).isDirectory()) {
    fs.mkdirSync(mockPath);
}
// birdmock配置
var configPath = path.resolve(mockPath, 'config.json');
if (!fs.existsSync(configPath) || !fs.statSync(configPath).isFile()) {
    var cfg = require('./config.json');
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, '\t'));
}
// mock数据文件路径
var mocksPath = path.resolve(mockPath, 'mocks');
if (!fs.existsSync(mocksPath) || !fs.statSync(mocksPath).isDirectory()) {
    fs.mkdirSync(mocksPath);
    var exampleFilePath = path.resolve(mocksPath, 'example.mock.js');
    var exampleFileContent = require('./example');
    fs.writeFileSync(exampleFilePath, exampleFileContent);
}
// log数据文件路径
var logsPath = path.resolve(mockPath, 'logs');
if (!fs.existsSync(logsPath) || !fs.statSync(logsPath).isDirectory()) {
    fs.mkdirSync(logsPath);
}
// 静态资源根路径
var assetsPath = path.resolve(mockPath, 'assets');
if (!fs.existsSync(assetsPath) || !fs.statSync(assetsPath).isDirectory()) {
    fs.mkdirSync(assetsPath);
}
// 文件上传根路径
var uploadPath = path.resolve(mockPath, 'upload');
if (!fs.existsSync(uploadPath) || !fs.statSync(uploadPath).isDirectory()) {
    fs.mkdirSync(uploadPath);
}

// 服务路径
var serverFilePath = path.resolve(__dirname, 'server/server.js');

// 收集mock服务路径，配置路径，mocks路径，logs路径
var paths = [serverFilePath, configPath, mocksPath, logsPath];
// 创建mock服务子进程
var worker = spawn(paths);
// 防抖时间ms
var debounceTime = require(configPath).watchDebounceTime;
// 监听配置文件的修改，以重新启动mock服务
fs.watch(configPath, {encoding:'utf8'}, listener());
// 递归监听mock数据文件的修改，以重新启动mock服务
fs.watch(mocksPath, {encoding:'utf8',recursive:true}, listener());

/**
 * 返回监听文件修改时要调用的函数（防抖）
 * @param {string[]} paths 服务路径，配置路径，mocks路径，logs路径
 * @param {number} time 防抖时间
 * @param {object} ctx 上下文
 * @returns {() => void}
 */
function listener() {
    return debounce(() => {
        worker.kill('SIGKILL');
        console.log('服务器重启中...'.yellow.bold);
        worker = spawn(paths);
    }, debounceTime, this);
}

/**
 * 主进程监听mock服务子进程的退出，若退出则重启子进程
 * @param {*} paths 服务路径，配置路径，mocks路径，logs路径
 */
function spawn(paths) {
    var worker = child_process.spawn('node', paths, {stdio: [process.stdin, process.stdout, process.stderr]});
    worker.on('exit', function (code) {
        // 非正常退出或非异常退出时才重启
        if (code !== 0 && code !== null) {
            spawn(serverFilePath);
        }
    });
    return worker;
}