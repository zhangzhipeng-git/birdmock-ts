"use strict";
/*
 * File: log.ts
 * Project: @bigbigbird/mock
 * File Created: Thursday, 6th April 2023 4:09:06 pm
 * Author: zhangzhipeng (1029512956@qq.com)
 * -----
 * Last Modified: Monday, 17th April 2023 2:48:31 pm
 * Modified By: zhangzhipeng (1029512956@qq.com>)
 * -----
 * Copyright 2019 - 2023
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
var log4js_1 = __importDefault(require("log4js"));
var CONFIG = {
    appenders: {
        stdout: { type: 'stdout' },
        dev: {
            type: 'dateFile',
            backups: 10,
            maxLogSize: 5242880,
            alwaysIncludePattern: true,
            pattern: 'yyyy-MM-dd.log',
        },
    },
    categories: {
        default: {
            appenders: ['stdout', 'dev'],
            level: 'info',
        },
    },
};
function getLogger(logsPath) {
    var appenders = CONFIG.appenders;
    var appenderKeys = Object.keys(appenders);
    appenderKeys.forEach(function (key) {
        if (appenders[key].type === 'stdout')
            return;
        appenders[key].filename = logsPath + '/mock';
    });
    log4js_1.default.configure(CONFIG);
    return log4js_1.default.getLogger();
}
exports.getLogger = getLogger;
