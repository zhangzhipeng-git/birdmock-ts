"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIPAdress = exports.debounce = exports.forEachFile = void 0;
var fs_1 = __importDefault(require("fs"));
var os_1 = __importDefault(require("os"));
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
