## Simple Injector Webpack Plugin

This is a [webpack](http://webpack.github.io/) plugin that inject output assets names (or rendered templates based on assets names) into specified files using *wiredep*-like syntax

```html
<!-- injector:js -->
<!-- endinjector -->
```

### Getting started

Install the plugin:

```
npm install --save-dev simple-injector-webpack-plugin
```

### Usage

`new SimpleInjectorPlugin(parameters)`

`parameters` is an object with injection parameters or an array of such objects.

#### Parameter object properties

- *eol* (~optional~)(*string*) - what type of EOL should be used. Possible values: `win`, `windows`. Windows results in `\r\n` EOL in an output file. The default value results `\r` EOL in an output file.
- *file* (*string*) - path to a file, that output assets need to be injected to. Can be absolute or relative to a current working directory (cwd).
- *filter* (~optional~)(*function*) - filter asset names for a current injector rule. Default: `() => true`.
- *injectorName* (~optional~)(*string*) - in what injector placeholder the data should be injected. E.g. setting it to `APP` will result in processing `<!-- injector:APP --><!-- endinjector -->` placeholders. Default: `js`.
- *template* (~optional~)(*function*) - template to render a string for a particular asset. Default: `assetName => assetName`


### Example

```javascript
'use strict';
const path = require('path');

const SimpleInjectorPlugin = require('simple-injector-webpack-plugin');

const OUTPUT_DIR = path.join(__dirname, 'Scripts', 'Dist');
const SOURCE_DIR = path.join(__dirname, 'Scripts', 'Src');

module.exports = {
    entry: {
      app: path.join(SOURCE_DIR, 'app', 'index.js'),
      vendor: path.join(SOURCE_DIR, 'vendor'),
    },
    output: {
        filename: '[name].[hash].js',
        path: path.join(OUTPUT_DIR),
    },
    plugins: [
        new SimpleInjectorPlugin({
            eol: 'win',
            file: path.join('Views', 'Layout', '_Base.cshtml'),
            filter: assetName => assetName.endsWith('.js'),
            injectorName: 'app',
            template: assetName => `<script src="/Scripts/Dist/${assetName}"></script>`
        }),
    ],
};
```

```razor
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>@ViewBag.Title</title>
</head>
<body>
@Html.Partial("_Header")
@Html.Partial("_Body")
@Html.Partial("_Footer")
<!-- injector:app -->
<!-- endinjector -->
</body>
</html>
```

Output:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>@ViewBag.Title</title>
</head>
<body>
@Html.Partial("_Header")
@Html.Partial("_Body")
@Html.Partial("_Footer")
<!-- injector:app -->
<script src="/Scripts/Dist/app.023ff67c2570bc070b0e.js"></script>
<!-- endinjector -->
</body>
</html>
```

### License

MIT