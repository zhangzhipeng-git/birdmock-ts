import log4js, { Configuration, type Logger } from 'log4js';

const CONFIG: Configuration = {
  appenders: {
    stdout: { type: 'stdout' },
    dev: {
      type: 'dateFile',
      backups: 10,
      maxLogSize: 5242880,
      alwaysIncludePattern: true,
      pattern: 'yyyy-MM-dd_HH-mm-ss.SSS.log',
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
    (<any>appenders[key]).filename = logsPath + '/';
  });

  log4js.configure(CONFIG);
  return log4js.getLogger();
}

export { getLogger, Logger };
