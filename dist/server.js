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
var fs_1 = __importDefault(require("fs"));
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
var LOCAL_REG = /localhost|127\.0\.0\.1/;
var DEFAULT_SERVER = 'localhost:4201';
var NOT_FOND = { code: 404, msg: '未找到注册的接口' };
var Server = (function () {
    function Server() {
        this.rootPath = '';
        this.setRootPath();
        this.setConfig();
        this.setLog();
        this.createServer();
        this.startServer();
    }
    Server.prototype.normalized = function (url) {
        if (!url)
            return '';
        if (url[url.length - 1] === '/')
            url = url.slice(0, -1);
        if (url.indexOf('://') < 0)
            return "http://".concat(url);
        return url;
    };
    Server.prototype.getPort = function (url) {
        if (!url)
            return;
        if (!url.includes(':'))
            return 80;
        var arr = url.split(':');
        return arr[2] ? +arr[2] : arr[1] ? +arr[1] : 80;
    };
    Server.prototype.isProxy2Server = function (host, server) {
        if (!host || !server)
            return false;
        host = this.normalized(host);
        server = this.normalized(server);
        if (host === server)
            return true;
        if (LOCAL_REG.test(host) && LOCAL_REG.test(server)) {
            var hostPort = this.getPort(host);
            var serverPort = this.getPort(server);
            return hostPort === serverPort;
        }
        return false;
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
        var _this = this;
        var configPath = this.getPaths()[0];
        var config = require(configPath);
        var _a = config.watchDebounceTime, watchDebounceTime = _a === void 0 ? 1000 : _a, _b = config.server, server = _b === void 0 ? DEFAULT_SERVER : _b, _c = config.parseJSON, parseJSON = _c === void 0 ? false : _c, proxy = config.proxy;
        var _d = process.env, cmdParseJSON = _d.parseJSON, cmdServer = _d.server, target = _d.target, rewrite = _d.rewrite, changeOrigin = _d.changeOrigin;
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
        if (proxy) {
            Object.keys(proxy).forEach(function (k) {
                var p = proxy[k];
                p.target = _this.normalized(p.target);
            });
        }
        this.config = {
            watchDebounceTime: watchDebounceTime,
            parseJSON: cmdParseJSON !== undefined ? cmdParseJSON === 'true' : parseJSON,
            server: this.normalized(cmdServer || server),
            proxy: proxy,
        };
    };
    Server.prototype.setMocks = function () {
        if (!!this.mocks)
            return;
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
        var _a, _b;
        return (_b = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split('?')[0]) !== null && _b !== void 0 ? _b : '';
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
    Server.prototype.enableCORS = function (res) {
        var cors = this.config.cors;
        if (!cors)
            return;
        res.setHeader('Access-Control-Allow-Origin', cors.origin || '*');
        res.setHeader('Access-Control-Allow-Headers', cors.headers || '*');
        res.setHeader('Access-Control-Allow-Methods', cors.methods || '*');
        res.setHeader('Access-Control-Allow-Credentials', (cors.credentials || true) + '');
    };
    Server.prototype.handleLocalServerRequest = function (req, res) {
        var _this = this;
        var _a, _b;
        req.on('error', function (e) {
            _this.log.error(e);
            res.end(JSON.stringify(e));
        });
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
        var _a;
        req.on('error', function (e) {
            _this.log.error(e);
            res.end(JSON.stringify(e));
        });
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
            res.setHeader('content-type', 'application/json;charset=utf-8');
            res.end(JSON.stringify(NOT_FOND));
            return;
        }
        var _b = proxy[apiKey], changeOrigin = _b.changeOrigin, rewrite = _b.rewrite, target = _b.target;
        var arr = target.split(':');
        var protocol = arr[0];
        var hostname = arr[1].substring(2, arr[1].length);
        var method = req.method;
        var port = arr[2] ? +arr[2] : 80;
        if (changeOrigin)
            req.headers.host = "".concat(hostname).concat(port != 80 ? ':' + port : '');
        if (!req.headers['content-type'])
            req.headers['content-type'] =
                'application/x-www-form-urlencoded;charset=UTF-8';
        var options = {
            headers: req.headers,
            protocol: "".concat(protocol, ":"),
            port: port,
            hostname: hostname,
            path: rewrite ? rewrite((_a = req.url) !== null && _a !== void 0 ? _a : '') : req.url,
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
                    _this.proxyServerResponse(req, res, params, httpX, options);
                });
                return;
            case RequestEnum.GET:
            case RequestEnum.DELETE:
            case RequestEnum.OPTIONS:
            default:
                params = querystring_1.default.parse(req.url.split('?')[1]);
                this.proxyServerResponse(req, res, params, httpX, options);
                return;
        }
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
        this.enableCORS(res);
        if (req.method === RequestEnum.OPTIONS)
            return res.end();
        var api = this.getApi(req);
        var key = this.getMatchKey(Object.keys(this.mocks), api);
        if (!key) {
            res.statusCode = 404;
            res.setHeader('content-type', 'application/json;charset=utf-8');
            res.end(JSON.stringify(NOT_FOND));
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
    Server.prototype.proxyServerResponse = function (req, res, params, httpX, options) {
        var _this = this;
        var _a = this.config, parseJSON = _a.parseJSON, server = _a.server;
        if (this.isProxy2Server(req.headers.host || '', server)) {
            this.setMocks();
            this.localServerResponse(req, res, params);
            return;
        }
        this.log.info("[".concat(req.headers['host'], "] [").concat(req.url, "]").concat(req.method, "=>\u8BF7\u6C42\u53C2\u6570:\r\n").concat(JSON.stringify(params, undefined, parseJSON ? '\t' : undefined)));
        httpX
            .request(options, function (res_) {
            var buffer = [];
            res_.on('data', function (chunk) {
                buffer.push(chunk);
            });
            res_.on('end', function () {
                var _a;
                buffer = buffer_1.Buffer.concat(buffer);
                res.setHeader('Content-Type', (_a = res_.headers['Content-Type']) !== null && _a !== void 0 ? _a : '');
                _this.enableCORS(res);
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
        })
            .end()
            .on('error', function (e) {
            _this.log.error(e);
            res.end(JSON.stringify(e));
        });
    };
    Server.prototype.createServer = function () {
        var _a = this.config, proxy = _a.proxy, server = _a.server;
        var hp = http_1.default;
        var args = [];
        if (server && server.indexOf('https') > -1) {
            var options = {
                key: fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), 'cert/server.key')),
                cert: fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), 'cert/server.crt')),
            };
            args.push(options);
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            hp = https_1.default;
        }
        if (!proxy) {
            this.setMocks();
            args.push(this.handleLocalServerRequest.bind(this));
            this.server = hp.createServer.apply(hp, args);
            return;
        }
        else {
            args.push(this.handleProxyServerRequest.bind(this));
            this.server = hp.createServer.apply(hp, args);
        }
    };
    Server.prototype.startServer = function () {
        var _this = this;
        var _a = this.config, _b = _a.server, server = _b === void 0 ? DEFAULT_SERVER : _b, proxy = _a.proxy;
        var arr = server.split(':');
        if (!arr[0])
            return;
        var port = arr[2] ? +arr[2] : arr[1] ? +arr[1] : 80;
        this.server.listen(port, function () {
            if (!proxy) {
                var mocksCount = Object.keys(_this.mocks).length;
                console.log('='.repeat(5).rainbow.bold.toString() +
                    '本地模式已启动'.green.bold +
                    "{ proxy => ".concat(server, " } { \u63A5\u53E3\u6570\u91CF:").concat(mocksCount, " }").yellow +
                    '='.repeat(5).rainbow.bold);
                return;
            }
            else {
                console.log('='.repeat(5).rainbow.bold.toString() +
                    "\u4EE3\u7406\u6A21\u5F0F\u5DF2\u542F\u52A8".green.bold +
                    '='.repeat(5).rainbow.bold);
                Object.keys(proxy).forEach(function (k) {
                    console.log("{ ".concat(k, " => ").concat(proxy[k].target, " }").yellow);
                });
            }
        });
        this.server.on('error', function (e) {
            console.error(e);
            process.exit(0);
        });
        process.on('SIGTERM', function () { return _this.server.close(function () { return process.exit(0); }); });
    };
    return Server;
}());
try {
    new Server();
}
catch (e) {
    console.error(e);
    process.exit(0);
}
