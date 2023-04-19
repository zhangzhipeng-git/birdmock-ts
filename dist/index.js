"use strict";
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
exports.UPLOAD_DIR = 'upload';
var SERVER_FILE_PATH = './server.js';
var ServerBoot = (function () {
    function ServerBoot() {
    }
    ServerBoot.getPaths = function () {
        var mockPath = path_1.default.resolve(process.cwd(), process.env.mockPath || exports.DEFAULT_ROOT_PATH);
        if (!fs_1.default.existsSync(mockPath) || !fs_1.default.statSync(mockPath).isDirectory()) {
            fs_1.default.mkdirSync(mockPath);
        }
        var configPath = path_1.default.resolve(mockPath, CONFIG_FILE);
        if (!fs_1.default.existsSync(configPath) || !fs_1.default.statSync(configPath).isFile()) {
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, CONFIG_FILE_TEMPLATE_PATH), configPath);
        }
        var mocksPath = path_1.default.resolve(mockPath, MOCKS_DIR);
        if (!fs_1.default.existsSync(mocksPath) || !fs_1.default.statSync(mocksPath).isDirectory()) {
            fs_1.default.mkdirSync(mocksPath);
        }
        var templateFilePath = path_1.default.resolve(mocksPath, MOCKS_FILE_TEMPLATE);
        if (!fs_1.default.existsSync(templateFilePath) ||
            !fs_1.default.statSync(templateFilePath).isFile())
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, MOCKS_FILE_TEMPLATE_PATH), templateFilePath);
        var logsPath = path_1.default.resolve(mockPath, LOGS_DIR);
        if (!fs_1.default.existsSync(logsPath) || !fs_1.default.statSync(logsPath).isDirectory()) {
            fs_1.default.mkdirSync(logsPath);
        }
        var assetsPath = path_1.default.resolve(mockPath, exports.ASSETS_DIR);
        if (!fs_1.default.existsSync(assetsPath) || !fs_1.default.statSync(assetsPath).isDirectory()) {
            fs_1.default.mkdirSync(assetsPath);
        }
        var uploadPath = path_1.default.resolve(mockPath, exports.UPLOAD_DIR);
        if (!fs_1.default.existsSync(uploadPath) || !fs_1.default.statSync(uploadPath).isDirectory()) {
            fs_1.default.mkdirSync(uploadPath);
        }
        var serverFilePath = path_1.default.resolve(__dirname, SERVER_FILE_PATH);
        return { serverFilePath: serverFilePath, configPath: configPath, mocksPath: mocksPath, logsPath: logsPath };
    };
    ServerBoot.spawn = function (paths) {
        var worker = child_process_1.default.spawn('node', paths, {
            stdio: [process.stdin, process.stdout, process.stderr],
        });
        return worker;
    };
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
            if (code === 0)
                return;
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
