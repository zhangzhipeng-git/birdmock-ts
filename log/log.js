/*
 * Created Date: Saturday, August 22nd 2020, 11:09:54 pm
 * Author: 木懵の狗纸
 * ---------------------------------------------------
 * Description: birdmock日志配置
 * ---------------------------------------------------
 * Last Modified: Sunday August 23rd 2020 11:16:43 pm
 * Modified By: 木懵の狗纸
 * Contact: 1029512956@qq.com
 * Copyright (c) 2020 ZXWORK
 */
// 日志配置
var log4js = require('log4js');
module.exports.getLogger = function(config) {
    log4js.configure(config);
    return log4js.getLogger(config.activeCategory);
}