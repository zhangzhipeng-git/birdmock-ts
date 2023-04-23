"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIPAdress = exports.debounce = exports.forEachFile = void 0;
var fs_1 = __importDefault(require("fs"));
var os_1 = __importDefault(require("os"));
/**
 * 获取本机ip
 */
function getIPAdress() {
    var interfaces = os_1.default.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; iface && i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' &&
                alias.address !== '127.0.0.1' &&
                !alias.internal) {
                return alias.address;
            }
        }
    }
}
exports.getIPAdress = getIPAdress;
/**
 * 遍历文件
 * @param {*} path 文件/文件夹
 * @param {*} callback 回调函数
 */
function forEachFile(path, callback) {
    if (path.endsWith('svn') || path.endsWith('git')) {
        return;
    }
    var stat = fs_1.default.statSync(path);
    if (stat.isDirectory()) {
        var files = fs_1.default.readdirSync(path);
        files.forEach(function (ele) {
            forEachFile(path + '/' + ele, callback);
        });
        return;
    }
    callback(path);
}
exports.forEachFile = forEachFile;
/**
 * 返回防抖函数
 * @param {*} f 目标函数
 * @param {*} t 防抖时延
 * @param {*} c 上下文
 */
function debounce(f, t, c) {
    var timer;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(function () { return f.apply(c, args); }, t);
    };
}
exports.debounce = debounce;
