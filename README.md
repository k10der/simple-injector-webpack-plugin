## Simple Injector Webpack Plugin

[![Build Status](https://travis-ci.org/k10der/simple-injector-webpack-plugin.svg?branch=master)](https://travis-ci.org/k10der/simple-injector-webpack-plugin)

This is a [webpack](http://webpack.github.io/) plugin that inject output assets names (or rendered templates based on assets names) into specified files using _wiredep_-like syntax.

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

- **eol** (_optional_)(**string**) - what type of EOL should be used. Possible values: `cmac`, `classicmac`, `\r` (results in `\r`); `unix`, `linux`, `osx`, `bsd`, `\n` (results in `\n`); `win`, `windows`, `\r\n` (results in `\r\n`). Default: `\r`.
- **file** (**string**) - path to a file, that output assets need to be injected to. Can be absolute or relative to a current working directory (cwd).
- **filter** (_optional_)(**function**|**string**) - filter asset names for a current injector rule. If a string, then assets names will be checked against RegExp: `assetName => assetName.match(new RegExp('provided string'))`. Default: `() => true`.
- **injectorName** (_optional_)(**string**) - in what injector placeholder the data should be injected. E.g. setting it to `APP` will result in processing `<!-- injector:APP --><!-- endinjector -->` placeholders. Default: `js`.
- **sort** (_optional_)(**function**|**array**) - how outputs of entries should be sorted. E.g. there are 2 entry points: **app** and **vendor**. And **vendor** should appear before **app** in the output file. To achieve such requirement we need to pass an array: `['vendor', 'app']`. It also possible to pass `+` and `-` as a sorting options, which allows us not enumerate all the entry points and set the order of injection for only the most important ones. E.g. there are a number of entry points: **app**, **jquery**, **shared**, **some-lib**, **vendor**. And we need to make **jquery** and **vendor** appear first and we don't care much about the order of the rest. To achieve such behavior we need to pass an array: `['jquery', 'vendor']` (or `['jquery', 'vendor', '+'`). Then the assets will be injected in the following order: **jquery**, **vendor**, **app**, **shared**, **some-lib**. In case if function is provided, function receives 1 parameter - an array of entry point objects with `name` property. The function must return a sorted array of entry points. Default: `['+']`. 
- **template** (_optional_)(**function**) - template to render a string for a particular asset. Default: `assetName => assetName`


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
        filename: '[name].js',
        path: path.join(OUTPUT_DIR),
    },
    plugins: [
        new SimpleInjectorPlugin({
            eol: 'win',
            file: path.join('Views', 'Layout', '_Base.cshtml'),
            filter: assetName => assetName.endsWith('.js'),
            injectorName: 'app',
            sort: ['vendor', 'app'],
            template: assetName => `<script src="/Scripts/Dist/${assetName}?rel=${(new Date()).getTime()}"></script>`
        }),
    ],
};
```

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
<script src="/Scripts/Dist/vendor.js?rel=1205651080324"></script>
<script src="/Scripts/Dist/app.js?rel=1205651080324"></script>
<!-- endinjector -->
</body>
</html>
```
