
自动化生成图标组件

## Step 1

在项目文件`pubspec.yml`中加入flutter插件 `flutter_svg`
```yaml
{
  ...

  dependencies:
    # 版本号请以官方库的为准：https://pub.dev/packages/flutter_svg
    flutter_svg: ^0.19.3
  ...
}
```
然后执行flutter插件安装操作
```bash
flutter packages get
```

接着安装全局插件（基于nodeJs）
```bash
将iconfont-cli 包复制到项目下
```

# Step 2
生成配置文件
```bash
./iconfont-cli init
```
此时项目根目录会生成一个`iconfont.json`的文件，内容如下：
```json
{
    "symbol_url": "请参考README.md，复制官网提供的JS链接",
    "save_dir": "./lib/iconfont",
    "trim_icon_prefix": "icon",
    "default_icon_size": 18,
    "null_safety": true,
    "match_text_direction":true
}
```
### 配置参数说明：
### symbol_url
请直接复制[iconfont](http://iconfont.cn)官网提供的项目链接。请务必看清是`.js`后缀而不是.css后缀。

<br />


### save_dir
根据iconfont图标生成的组件存放的位置。每次生成组件之前，该文件夹都会被清空。

### trim_icon_prefix
如果你的图标有通用的前缀，而你在使用的时候又不想重复去写，那么可以通过这种配置这个选项把前缀统一去掉。

### default_icon_size
我们将为每个生成的图标组件加入默认的字体大小，当然，你也可以通过传入props的方式改变这个size值

### null_safety
dart 2.12.0 开始支持的空安全特性，开启该参数后，生成的语法会有所变化，所以需要变更sdk以保证语法能被识别。

### match_text_direction
true表示图标需要适配方向，例如阿拉伯语下某些图标不应该镜像，把这个值设置为false。
```diff
environment:
- sdk: ">=2.7.0 <3.0.0"
+ sdk: ">=2.12.0 <3.0.0"
```

# Step 3
开始生成flutter标准组件
```bash
./iconfont-cli
```
生成后查看您设置的保存目录中是否含有所有的图标

-----------


# 使用

### 图标尺寸
根据配置`default_icon_size`，每个图标都会有一个默认的尺寸，你可以随时覆盖。
```dart
class App extends StatelessWidget {
    @override
    Widget build(BuildContext context) {
        return IconFont(IconNames.alipay, size: 100);
    }
}
```

**注意：如果你在props传入的color是字符串而不是数组，那么即使原本是多色彩的图标，也会变成单色图标。**

```dart
IconFont(IconNames.alipay, color: 'red');
```

### 图标多色彩
多色彩的图标，如果不指定颜色值，图标将渲染原本的多色彩。如果你想设置为其他的颜色，那么设置一组你想要的颜色即可
```dart
IconFont(IconNames.alipay, colors: ['green', 'orange']);
```
颜色组的数量以及排序，需要根据当前图标的信息来确定。您需要进入图标组件中查看并得出结论。
# 图标透明度
opacity为50%
```dart
IconFont(IconNames.alipay, colors: ['green', 'orange'],opacity:0.5);
```

# 图标方向可以镜像
```dart
IconFont(IconNames.alipay, colors: ['green', 'orange'],matchTextDirection:true);
```

# 更新图标
当您在iconfont.cn 中的图标有变更时，只需更改配置`symbol_url`，然后再次执行`Step 3`即可生成最新的图标组件
```bash
# 修改 symbol_url 配置后执行：
执行./iconfont-cli  生成图标文件
```
# 如果 iconfont-cli.exe 生成的图标路径不符合预期（被 Iconfont 优化路径等），请按以下步骤强制使用本地文件：
- 
- 改名：重命名 SVG，文件名必须与 Iconfont 网站上的图标 ID 严格一致。
  - 例子：在icon_font.dart文件看到的id是exhaust_fan -> 文件名改为 icon-exhaust_fan.svg
- 覆盖：放入和iconfont.json同目录下的 assets/replace_iconfont_svg 文件夹
```bash
执行./iconfont-cli  生成图标文件
```

# 如果项目中的iconfont-cli 无法满足你 的需求，可以修改配置后
安装打包的安装包 npm install -g pkg
npm install
执行 npm run build
打包 pkg . --output iconfont-cli  
# mac 电脑使用这句配置 package.json
  "scripts": {
    "build": "tsc && cpx \"src/templates/*\" dist/templates",
    "start": "node dist/index.js"
  },
 # window如何无法正常运行，使用webpack
  "scripts": {
    "build": "webpack",
    "start": "node build/bundle.js"
  },