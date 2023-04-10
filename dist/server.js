"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
var path_1 = __importDefault(require("path"));
var http_1 = __importDefault(require("http"));
var https_1 = __importDefault(require("https"));
var mockjs_1 = __importDefault(require("mockjs"));
var querystring_1 = __importDefault(require("querystring"));
var zlib_1 = require("zlib");
var log_1 = require("./log");
var util_1 = require("./util");
var buffer_1 = require("buffer");
var multiparty_1 = __importDefault(require("multiparty"));
var _1 = require(".");
var RequestEnum;
(function (RequestEnum) {
    RequestEnum["POST"] = "POST";
    RequestEnum["PUT"] = "PUT";
    RequestEnum["GET"] = "GET";
    RequestEnum["DELETE"] = "DELETE";
    RequestEnum["OPTIONS"] = "OPTIONS";
})(RequestEnum || (RequestEnum = {}));
var Server = (function () {
    function Server() {
        this.rootPath = '';
        this.getPaths();
        this.setRootPath();
        this.setLog();
        this.createServer();
        this.startServer();
    }
    Server.prototype.startServer = function () {
        var _a = this.config, server = _a.server, proxy = _a.proxy;
        if (!server)
            return;
        var arr = server.split(':');
        if (!arr[0])
            return;
        var port = arr[2] ? +arr[2] : arr[1] ? +arr[1] : 80;
        var mocksCount = Object.keys(this.mocks).length;
        this.server.listen(port, function () {
            if (!proxy) {
                console.log('='.repeat(5).rainbow.bold.toString() +
                    '本地模式已启动'.green.bold +
                    "{ proxy => ".concat(server, " } { \u63A5\u53E3\u6570\u91CF:").concat(mocksCount, " }").yellow +
                    '='.repeat(5).rainbow.bold);
                return;
            }
            else {
                console.log('='.repeat(5).rainbow.bold.toString() +
                    "\u4EE3\u7406\u6A21\u5F0F\u5DF2\u542F\u52A8".green.bold +
                    "{ \u63A5\u53E3\u6570\u91CF:".concat(mocksCount, " }").yellow +
                    '='.repeat(5).rainbow.bold);
                Object.keys(proxy).forEach(function (k) {
                    console.log("{ ".concat(k, " => ").concat(proxy[k].target, " }").yellow);
                });
            }
        });
    };
    Server.prototype.getPaths = function () {
        return process.argv.slice(2);
    };
    Server.prototype.resolve = function () {
        var dir = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            dir[_i] = arguments[_i];
        }
        return path_1.default.resolve.apply(path_1.default, __spreadArray([process.cwd()], dir, false));
    };
    Server.prototype.setRootPath = function () {
        this.rootPath = this.resolve(process.env.mockRootPath || _1.DEFAULT_ROOT_PATH);
    };
    Server.prototype.setConfig = function () {
        var configPath = this.getPaths()[0];
        var config = require(configPath);
        var server = config.server, proxy = config.proxy, parseJSON = config.parseJSON;
        var _a = process.env, cmdServer = _a.server, cmdParseJSON = _a.parseJSON, target = _a.target, rewrite = _a.rewrite, changeOrigin = _a.changeOrigin;
        if (target) {
            var arr_1 = [''];
            if (rewrite)
                arr_1 = rewrite.replace(/'/g, '').split(':');
            if (!proxy)
                proxy = {};
            proxy[arr_1[0]] = {
                changeOrigin: changeOrigin === 'true',
                target: target,
                rewrite: function (url) {
                    return !rewrite || rewrite.indexOf(':') < 0
                        ? url
                        : url.replace(new RegExp(arr_1[0]), arr_1[1]);
                },
            };
        }
        var svr = cmdServer || server;
        if (svr && svr.indexOf('http') < 0)
            svr = "http://".concat(svr);
        this.config = {
            parseJSON: cmdParseJSON === 'true' || parseJSON,
            server: svr,
            proxy: proxy,
        };
    };
    Server.prototype.setMocks = function () {
        var mocksPath = this.getPaths()[1];
        var mocks = {};
        (0, util_1.forEachFile)(mocksPath, function (file) {
            try {
                if (file.indexOf('.js') < 0)
                    return;
                var mock = require(file);
                Object.assign(mocks, mock);
            }
            catch (e) {
                console.log("".concat('文件'.yellow).concat('['.green).concat(file.red).concat(']'.green).concat('注册mock失败'.yellow, "\r\n\u539F\u56E0\r\n").concat(e));
            }
        });
        this.mocks = mocks;
    };
    Server.prototype.setLog = function () {
        var logsPath = this.getPaths()[2];
        this.log = (0, log_1.getLogger)(logsPath);
    };
    Server.prototype.expectRequestType = function (req, type) {
        var contentType;
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
        return req.headers['content-type'].indexOf(contentType) > -1;
    };
    Server.prototype.getApi = function (req) {
        var _a;
        var server = this.config.server;
        var svr = server !== null && server !== void 0 ? server : '';
        if (svr && svr.indexOf('http') < 0)
            svr = "http://".concat(svr);
        if (svr && svr[svr.length - 1] === '/')
            svr = svr.slice(0, -1);
        var url = (_a = req.url) !== null && _a !== void 0 ? _a : '';
        if (url && url.indexOf('http') < 0)
            url = "http://".concat(url);
        return url.replace(svr, '');
    };
    Server.prototype.getMatchKey = function (keys, api) {
        if (api.indexOf('?') > -1)
            api = api.split('?')[0];
        if (keys.includes(api))
            return api;
        var genericKeys = keys.filter(function (k) { return k.indexOf('*') > -1; });
        var arr1 = api.split('/');
        return (genericKeys.find(function (k) {
            var arr2 = k.split('/');
            return (arr1.length === arr2.length &&
                arr2.every(function (dir, i) { return dir === '*' || dir === arr1[i]; }));
        }) || null);
    };
    Server.prototype.enableCROS = function (res) {
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
    };
    Server.prototype.handleLocalServerRequest = function (req, res) {
        var _this = this;
        var _a, _b;
        var params, rawData = '', method = req.method;
        switch (method) {
            case RequestEnum.POST:
            case RequestEnum.PUT:
                if (this.expectRequestType(req, 'upload')) {
                    this.handleLocalUpload(req, res, params);
                    return;
                }
                req.setEncoding('utf-8');
                req.on('data', function (chunk) {
                    rawData += chunk;
                });
                req.on('end', function () {
                    var params;
                    if (_this.expectRequestType(req, 'json'))
                        params = JSON.parse(rawData);
                    else if (_this.expectRequestType(req, 'generic'))
                        params = querystring_1.default.parse(rawData);
                    else
                        params = rawData;
                });
                break;
            case RequestEnum.GET:
            case RequestEnum.DELETE:
            case RequestEnum.OPTIONS:
            default:
                params = querystring_1.default.parse((_b = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split('?')[1]) !== null && _b !== void 0 ? _b : '');
                break;
        }
        this.localServerResponse(req, res, params);
    };
    Server.prototype.handleProxyServerRequest = function (req, res) {
        var _this = this;
        var proxy = this.config.proxy;
        if (!proxy)
            return;
        var api = this.getApi(req);
        var apiKeys = Object.keys(proxy);
        var apiKey = apiKeys.find(function (k) {
            return new RegExp(k).test(api);
        });
        if (!apiKey) {
            res.statusCode = 404;
            res.end();
            return;
        }
        var _a = proxy[apiKey], changeOrigin = _a.changeOrigin, rewrite = _a.rewrite, target = _a.target;
        var arr = target.split(':');
        var protocol = arr[0].indexOf('http') > -1 ? arr[0] : 'http';
        var hostname = arr[1].substring(2, arr[1].length);
        var method = req.method;
        var port = arr[2] ? +arr[2] : 80;
        if (changeOrigin)
            req.headers.host = "".concat(hostname).concat(port ? ':' + port : '');
        if (!req.headers['content-type'])
            req.headers['content-type'] =
                'application/x-www-form-urlencoded;charset=UTF-8';
        var options = {
            headers: req.headers,
            protocol: "".concat(protocol, ":"),
            port: port,
            hostname: hostname,
            path: rewrite ? rewrite(api) : api,
            method: method,
        };
        var httpX = arr[0] === 'https' ? https_1.default : http_1.default;
        var params, rawData = '';
        switch (method) {
            case RequestEnum.POST:
            case RequestEnum.PUT:
                req.on('data', function (chunk) {
                    rawData += chunk;
                });
                req.on('end', function () {
                    if (_this.expectRequestType(req, 'json'))
                        params = JSON.parse(rawData);
                    else if (_this.expectRequestType(req, 'generic'))
                        params = querystring_1.default.parse(rawData);
                    else
                        params = rawData;
                });
                break;
            case RequestEnum.GET:
            case RequestEnum.DELETE:
            case RequestEnum.OPTIONS:
            default:
                params = querystring_1.default.parse(req.url.split('?')[1]);
                break;
        }
        this.proxyServerResponse(req, res, params, httpX, options);
    };
    Server.prototype.proxyServerResponse = function (req, res, params, httpX, options) {
        var _this = this;
        var parseJSON = this.config.parseJSON;
        this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u8BF7\u6C42\u53C2\u6570:\r\n").concat(JSON.stringify(params, undefined, parseJSON ? '\t' : undefined)));
        var req_ = httpX.request(options, function (res_) {
            var buffer = [];
            res_.on('data', function (chunk) {
                buffer.push(chunk);
            });
            res_.on('end', function () {
                var _a;
                buffer = buffer_1.Buffer.concat(buffer);
                res.setHeader('Content-Type', (_a = res_.headers['Content-Type']) !== null && _a !== void 0 ? _a : '');
                _this.enableCROS(res);
                res.statusCode = res_.statusCode || res.statusCode;
                res.end(buffer);
                var resStr, bf = buffer;
                if ((res_.headers['content-encoding'] || '').indexOf('gzip') > -1)
                    bf = (0, zlib_1.gunzipSync)(buffer);
                resStr = bf.toString('utf-8');
                try {
                    var obj = JSON.parse(resStr);
                    _this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u54CD\u5E94:\r\n") +
                        JSON.stringify(obj, void 0, parseJSON ? '\t' : void 0));
                }
                catch (e) {
                    console.log('对方返回了非json格式数据~'.red.bold);
                    _this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u54CD\u5E94:\r\n") +
                        buffer);
                }
            });
        });
        req_.end();
    };
    Server.prototype.handleLocalUpload = function (req, res, params) {
        var _this = this;
        var form = new multiparty_1.default.Form({
            uploadDir: this.resolve(this.rootPath, _1.UPLOAD_DIR),
        });
        form.parse(req, function (err, fields, files) {
            if (err)
                _this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u6587\u4EF6\u4E0A\u4F20\u9519\u8BEF:\r\n").concat(err));
            _this.localServerResponse(req, res, __assign(__assign({}, fields), files));
        });
    };
    Server.prototype.localServerResponse = function (req, res, params) {
        var _this = this;
        var parseJSON = this.config.parseJSON;
        this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u8BF7\u6C42\u53C2\u6570:\r\n").concat(JSON.stringify(params, undefined, parseJSON ? '\t' : undefined)));
        this.enableCROS(res);
        if (req.method === RequestEnum.OPTIONS)
            return res.end();
        var api = this.getApi(req);
        var key = this.getMatchKey(Object.keys(this.mocks), api);
        if (!key) {
            res.statusCode = 404;
            res.end();
            return;
        }
        var value = this.mocks[key];
        if (typeof value === 'function')
            value = value(params);
        setTimeout(function () {
            if (value && value.statusCode) {
                res.statusCode = value.statusCode;
                value = value.data;
            }
            var isFile = true;
            var match = key.match(/\.(?:svg|jpg|jpeg|png|gif|wav|txt|css|html|js)/);
            if (match) {
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
                    '.js': 'application/javascript',
                };
                res.setHeader('Content-type', CT[match[0]]);
                res.end(value);
            }
            else if (value && value.buffer && value.buffer instanceof buffer_1.Buffer) {
                res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                res.setHeader('Content-Disposition', "attachment;filename=".concat(value.filename));
                res.setHeader('Content-type', value['Content-Type'] || 'application/octet-stream');
                res.end(value.buffer);
            }
            else {
                isFile = false;
                value = mockjs_1.default.mock(value);
                res.setHeader('Content-Type', 'application/json;charset=utf-8');
                res.end(JSON.stringify(value));
            }
            _this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u54CD\u5E94:\r\n") +
                (isFile
                    ? value
                    : JSON.stringify(value, undefined, parseJSON ? '\t' : undefined)));
        }, (value && value.timeout) || 0);
    };
    Server.prototype.createServer = function () {
        var proxy = this.config.proxy;
        if (!proxy) {
            this.setMocks();
            this.createLocalServer();
            return;
        }
        else {
            this.createProxyServer();
        }
    };
    Server.prototype.createLocalServer = function () {
        this.server = http_1.default.createServer(this.handleLocalServerRequest);
    };
    Server.prototype.createProxyServer = function () {
        this.server = http_1.default.createServer(this.handleProxyServerRequest);
    };
    return Server;
}());
new Server();
process.on('SIGKILL', function () {
    process.exit(0);
});
