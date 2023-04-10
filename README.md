# birdmock（结合 mockjs 开发的本地 mock 服务）

## 安装

```shell
npm i @bigbigbird/mock -D
```

## mock 配置

优先读取环境变量的 mockPath 的路径，并自动在该目录下建立相关 mock 文件，没有则自动在项目根目录创建，它的默认文件结构应该是这样的：

```*
 -项目根路径
 -birdmock
    -logs           # 日志目录
    -mocks          # mock文件目录
    -config.js      # birdmock配置文件
    -assets         # 静态资源
    -upload         # 文件上传目录
```

## 默认代理配置（in birdmock/config.js）

```js
module.exports = {
  /** 修改 mock 文件时重启服务的防抖时间 */
  watchDebounceTime: 1000,
  /** 日志是否格式化响应的json数据 */
  parseJSON: false,
  /** 正向代理地址 */
  server: 'localhost:4200',
  /** 目标地址 */
  proxy: {
    '/api': {
      target: 'https://zzp-dog.github.io/',
      changeOrigin: true,
      rewrite: url => url,
    },
  },
};
```

1.birdmock 不依赖 webpack 等开发工具，可单独启动服务，类似 express 和 koa 搭建服务；

2.proxy 中 target 表示 server 要转发以指定 api 前缀开头的请求到目标服务器的服 务器地址；

3.server 为本地的服务地址，如: localhost:4200

4.在 webpack 配置中，可以将 proxy 配置到本地 server，可以记录日志。

## 可以单独启动本地服务，或通过本地服务代理到 target 目标服务

in package.json

```json
"scripts": {
    "mock": "birdmock"
}
```

```shell
npm run mock
```

```json
"scripts": {
    "mock:proxy": "cross-env target=https://zzp-dog.github.io/ birdmock",,
    "mock:proxy1": "cross-env target=https://zzp-dog.github.io/ rewrite='^/api':'/xxx' changeOrigin=true birdmock",
}
```

```shell
npm run mock:proxy
```

## 引入到 webpack 配置

```js
var config = require('./birdmock/config.js');
module.exports = {
  devServer: {
    proxy: {
      '^/api': {
        target: config.server,
      },
      // '^/': {
      //   target: config.server,
      // },
    },
  },
};
```

## mock 文件示例

```js
module.exports = {
  // 键值可以是函数也可以是对象
  '/example': params => {
    if (params.id === '1') {
      return {
        status: 200,
        data: {
          content: '我是示例mock返回的数据1',
        },
      };
    } else {
      return {
        status: 400,
        data: {
          content: '我是示例mock返回的数据2',
        },
      };
    }
  },
};
```

## 接口请求（本地服务模式）示例

in package.json

```json
"scripts": {
    "mock": "birdmock"
}
```

```shell
npm run mock
```

in template

```html
<template>
  <div id="app">
    <pre><code ref="json" class="json">{{res1|json}}</code></pre>
  </div>
</template>
```

in ts

```typescript
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import axios from 'axios';
@Component({
  filters: {
    json(o: any) {
      return JSON.stringify(o, null, '\t');
    }
  }
})
export default class App extends Vue {
  res1: any = {};
  beforeMount() {
    const baseURL = process.env.NODE_ENV === 'development' ? '/api' : '';
    var  http = axios.create({baseURL});
    http.get('/example').then(({data}: any) => {
        this.res1 = data;
        this.$nextTick(() => {
            if (!(<any>window).hljs) return;
            (<any>window).hljs.highlightBlock(this.$refs.json);
        })
    });
  }
}
</script>

```

## 接口请求（本地服务代理模式）示例

in package.json

```json
"scripts": {
    "mock:proxy": "cross-env target=https://zzp-dog.github.io/ birdmock"
}
```

```shell
npm run mock:proxy
```

in template

```html
<template>
  <div id="app">
    <pre><code ref="json" class="json">{{res1|json}}</code></pre>
  </div>
</template>
```

in ts

```typescript
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import axios from 'axios';
@Component({
  filters: {
    json(o: any) {
      return JSON.stringify(o, null, '\t');
    }
  }
})
export default class App extends Vue {
  res1: any = {};
  beforeMount() {
    const baseURL = process.env.NODE_ENV === 'development' ? '/api' : '';
    var  http = axios.create({baseURL});
    http.get('/birdmock/package.json').then(({data}: any) => {
        this.res1 = data;
        this.$nextTick(() => {
            if (!(<any>window).hljs) return;
            (<any>window).hljs.highlightBlock(this.$refs.json);
        })
    });
  }
}
</script>

```
