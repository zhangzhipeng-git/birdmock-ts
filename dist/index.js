"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerBoot = exports.UPLOAD_DIR = exports.ASSETS_DIR = exports.DEFAULT_ROOT_PATH = void 0;
require("colors");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var child_process_1 = __importDefault(require("child_process"));
var util_1 = require("./util");
exports.DEFAULT_ROOT_PATH = 'birdmock';
var CONFIG_FILE = 'config.js';
var CONFIG_FILE_TEMPLATE_PATH = './template/config.js';
var MOCKS_DIR = 'mocks';
var MOCKS_FILE_TEMPLATE = 'response.js';
var MOCKS_FILE_TEMPLATE_PATH = './template/response.js';
var LOGS_DIR = 'logs';
exports.ASSETS_DIR = 'assets';
var SVG_FILE_TEMPLATE = 'bird.svg';
var SVG_FILE_TEMPLATE_PATH = './template/bird.svg';
exports.UPLOAD_DIR = 'upload';
var SERVER_FILE_PATH = './server.js';
var ServerBoot = /** @class */ (function () {
    function ServerBoot() {
    }
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
    ServerBoot.getPaths = function () {
        // birdmock路径
        var mockPath = path_1.default.resolve(process.cwd(), process.env.mockPath || exports.DEFAULT_ROOT_PATH);
        if (!fs_1.default.existsSync(mockPath) || !fs_1.default.statSync(mockPath).isDirectory()) {
            fs_1.default.mkdirSync(mockPath);
        }
        // birdmock配置
        var configPath = path_1.default.resolve(mockPath, CONFIG_FILE);
        if (!fs_1.default.existsSync(configPath) || !fs_1.default.statSync(configPath).isFile()) {
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, CONFIG_FILE_TEMPLATE_PATH), configPath);
        }
        // mock数据文件路径
        var mocksPath = path_1.default.resolve(mockPath, MOCKS_DIR);
        if (!fs_1.default.existsSync(mocksPath) || !fs_1.default.statSync(mocksPath).isDirectory()) {
            fs_1.default.mkdirSync(mocksPath);
        }
        var templateFilePath = path_1.default.resolve(mocksPath, MOCKS_FILE_TEMPLATE);
        if (!fs_1.default.existsSync(templateFilePath) ||
            !fs_1.default.statSync(templateFilePath).isFile())
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, MOCKS_FILE_TEMPLATE_PATH), templateFilePath);
        // 日志路径配置
        var logsPath = path_1.default.resolve(mockPath, LOGS_DIR);
        if (!fs_1.default.existsSync(logsPath) || !fs_1.default.statSync(logsPath).isDirectory()) {
            fs_1.default.mkdirSync(logsPath);
        }
        // 静态资源根路径
        var assetsPath = path_1.default.resolve(mockPath, exports.ASSETS_DIR);
        if (!fs_1.default.existsSync(assetsPath) || !fs_1.default.statSync(assetsPath).isDirectory()) {
            fs_1.default.mkdirSync(assetsPath);
        }
        var svgTestFile = path_1.default.resolve(assetsPath, SVG_FILE_TEMPLATE);
        if (!fs_1.default.existsSync(svgTestFile) || !fs_1.default.statSync(svgTestFile).isFile())
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, SVG_FILE_TEMPLATE_PATH), svgTestFile);
        // 文件上传根路径
        var uploadPath = path_1.default.resolve(mockPath, exports.UPLOAD_DIR);
        if (!fs_1.default.existsSync(uploadPath) || !fs_1.default.statSync(uploadPath).isDirectory()) {
            fs_1.default.mkdirSync(uploadPath);
        }
        // 服务路径
        var serverFilePath = path_1.default.resolve(__dirname, SERVER_FILE_PATH);
        return { serverFilePath: serverFilePath, configPath: configPath, mocksPath: mocksPath, logsPath: logsPath };
    };
    /**
     * 创建子进程
     * @param {string[]} paths 服务路径，配置路径，mocks路径，logs路径
     */
    ServerBoot.spawn = function (paths) {
        var worker = child_process_1.default.spawn('node', paths, {
            stdio: [process.stdin, process.stdout, process.stderr],
        });
        return worker;
    };
    /**
     * 返回监听文件修改时要调用的函数（防抖）
     * @param {string[]} paths 服务启动、 mock配置、mock数据及日志文件路径
     * @param {number} debounceTime 防抖时间
     */
    ServerBoot.listener = function (paths, debounceTime) {
        var _this = this;
        if (debounceTime === void 0) { debounceTime = 1000; }
        return (0, util_1.debounce)(function () {
            _this.worker.kill();
            console.log('服务器重启中...'.yellow.bold);
            _this.worker = _this.spawn(paths);
        }, debounceTime);
    };
    ServerBoot.main = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a = this.getPaths(), serverFilePath = _a.serverFilePath, configPath = _a.configPath, mocksPath = _a.mocksPath, logsPath = _a.logsPath;
        var paths = [serverFilePath, configPath, mocksPath, logsPath];
        var debounceTime = require(configPath).watchDebounceTime;
        this.worker = this.spawn(paths);
        this.worker.on('exit', function (code, signal) {
            // 正常退出不重启服务
            if (code === 0)
                return;
            // 正常终止不重启服务
            if (signal === 'SIGTERM')
                return;
            _this.spawn(paths);
        });
        fs_1.default.watch(configPath, { encoding: 'utf8' }, this.listener(paths, debounceTime));
        fs_1.default.watch(mocksPath, { encoding: 'utf8', recursive: true }, this.listener(paths, debounceTime));
        process.on('SIGTERM', function () {
            _this.worker.kill();
            process.exit(0);
        });
    };
    return ServerBoot;
}());
exports.ServerBoot = ServerBoot;
