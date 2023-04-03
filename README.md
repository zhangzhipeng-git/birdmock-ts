# birdmock（结合mockjs开发的本地mock服务）

## 安装

``` shell
npm i @bigbigbird/mock -D
```

## mock配置

优先读取环境变量的mockPath的路径，并自动在该目录下建立相关mock文件，没有则自动在项目根目录创建，它的默认文件结构应该是这样的：

```*
 -项目根路径  
 -birdmock  
    -logs           # 日志目录
    -mocks          # mock文件目录
    -config.json    # birdmock配置文件
```

## 默认代理配置（in birdmock/config.json）

```json
"localServerKey": "/api",
"localServerProxy": "https://zzp-dog.github.io/",
"proxy": {
    "/api": {
        "target": "http://localhost:4200",
        "changeOrigin": true,
        "pathRewrite": {
            "^/api": ""
        }
    }
}
```

1.可以直接将proxy引入webpack相关的配置中；  

2.proxy中target表示webpack要转发以指定api前缀开头的请求到目标服务器的服 务器地址；  

3.localServerKey表示本地要代理的请求的api前缀，它对应着proxy中的api前缀，且这个前缀开头的api要转发到本地服务，前提是要在本地开启服务，birdmock的工作就是这个，它会根据localServerKey对应的proxy配置在本地创建一个本地mock服务，所以target必须是本地的服务，如果不是本地的服务，webpack会将请求转发到这个服务，后续的请求将会被webpack代理到这个服务而不是本地服务；  

4.localServerProxy表示本地服务要代理的服务地址，这样就是经过两层正向代理了，第一层是webpack-dev-server代理到本地，第二层是本地代理到localServerProxy指向的服务地址。当然也可以在birdmock脚本命令中添加cross-env proxy=[https://zzp-dog.github.io/](https://zzp-dog.github.io/) 。birdmock内部会优先读取cross-env设置的环境变量中的目标代理服务地址proxy=[https://zzp-dog.github.io/](https://zzp-dog.github.io/)。

## 引入到webpack相关配置

``` js
module.exports = {
    devServer: {
        proxy: require('./birdmock/config.json').proxy
    }
}
```

## mock文件示例

```js
module.exports = {
    // 键值可以是函数也可以是对象
    '/example': (params) => {
        if (params.id === '1') {
            return {
                status: 200,
                data: {
                    content: '我是示例mock返回的数据1'
                }
            }
        } else {
            return {
                status: 400,
                data: {
                    content: '我是示例mock返回的数据2'
                }
            }
        }
    }
}
```

## package.json

``` json
"scripts": {
    "mock:proxy": "cross-env proxy=https://zzp-dog.github.io/ birdmock"
}
```

``` shell
npm run mock:proxy
```

备注：birdmock本地服务会优先读取脚本命令中设置的proxy值（目标代理服务地址），其次才是birdmock/config.json中的localServerProxy值。

## 接口请求（本地服务模式）示例

前提：删除birdmock/config.json中"localServerProxy":xxx和package.json中cross-env proxy=xxx。  

in template

``` html
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
    /**
     * 开发环境会在接口前面加上'/api'，上面已经配置过以"/api"开头的接口
     * 会被代理到本地服务，如果localServerProxy或环境变量中proxy有服务地址，
     * 本地服务会代理请求到这个服务地址。
     */
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

in template

``` html
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
    /**
     * 开发环境会在接口前面加上'/api'，上面已经配置过以"/api"开头的接口
     * 会被代理到本地服务，如果localServerProxy或环境变量中proxy有服务地址，
     * 本地服务会代理请求到这个服务地址。
     */
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
