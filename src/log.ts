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

import log4js, { Configuration, type Logger } from 'log4js';

const CONFIG: Configuration = {
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

function getLogger(logsPath: string) {
  const appenders = CONFIG.appenders;
  const appenderKeys = Object.keys(appenders);
  appenderKeys.forEach(key => {
    if (appenders[key].type === 'stdout') return;
    (<any>appenders[key]).filename = logsPath + '/mock';
  });

  log4js.configure(CONFIG);
  return log4js.getLogger();
}

export { getLogger, Logger };
