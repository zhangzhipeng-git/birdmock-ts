/*
 * Created Date: Saturday, August 22nd 2020, 11:09:54 pm
 * Author: 木懵の狗纸
 * ---------------------------------------------------
 * Description: birdmock工具
 * ---------------------------------------------------
 * Last Modified: Sunday August 23rd 2020 11:15:53 pm
 * Modified By: 木懵の狗纸
 * Contact: 1029512956@qq.com
 * Copyright (c) 2020 ZXWORK
 */

var fs = require('fs');
const os = require('os');

/**
 * 获取本机ip
 */
function getIPAdress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
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
function forEachFile(path, callback) {
    if (callback.break) {
        return;
    }
    if (path.endsWith('svn') || path.endsWith('git')) {
        return;
    }
    var stat = fs.statSync(path);
    if (stat.isDirectory()) {
        var files = fs.readdirSync(path);
        files.forEach((ele) => {
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
function debounce(f, t, c) {
    var timer;
    return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            f.apply(c || this, arguments);
        }, t);
    }
}

module.exports = {
    forEachFile,
    debounce,
    getIPAdress
}