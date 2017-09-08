'use strict';
const fs = require('fs');
const path = require('path');

const async = require('async');
const fileExists = require('file-exists');

class SimpleInjectorWebpackPlugin {
  constructor(parameters) {
    this._parameters = [];

    if (Array.isArray(parameters)) {
      for (let o of parameters) {
        this._processParameters(o);
      }
    } else if (typeof parameters === 'object') {
      this._processParameters(parameters);
    } else {
      throw new Error('No or wrong configuration provided');
    }
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, cb) => {
      const outputs = {};
      for (let a in compilation.assets) {
        for (let p of this._parameters) {
          if (!outputs.hasOwnProperty(p.file)) {
            outputs[p.file] = {
              eol: p.eol,
              re: p.re,
              strings: [],
            };
          }
          
          if (p.filter(a)) {
            outputs[p.file].strings.push(p.template(a));
          }
        }
      }
      
      async.eachOf(outputs, (data, path, cb) => {
        fs.readFile(path, 'utf-8', (err, fileContent) => {
          if (err) {
            return cb(err);
          }
          const match = new RegExp(data.re, 'g').exec(fileContent);
          const replacement = `${match[2]}${data.eol}${data.strings.join(data.eol)}${data.eol}${match[4]}`;
          const newFileContent = fileContent.replace(match[0], replacement);

          fs.writeFile(path, newFileContent, cb);
        });

      }, cb);
    });
  }

  _processParameters(parameters) {
    const parameter = {};

    parameter.eol = ['win', 'windows'].indexOf(parameters.eol) !== -1 ? '\r\n' : '\n';

    if (!parameters.file) {
      throw new Error(`Required 'file' property is missing on parameters object`);
    } else {
      let filePaths = [
        parameters.file,
        path.join(process.cwd(), parameters.file),
      ];

      if (fileExists.sync(filePaths[0])) {
        parameter.file = filePaths[0];
      } else if (fileExists.sync(filePaths[1])) {
        parameter.file = filePaths[1];
      } else {
        throw new Error(`Couldn't find provided file path (checked in "${filePaths.join('", "')}")`);
      }
    }

    // TODO provide custom token options
    parameter.re = `((<!-- *injector:${parameters.injectorName || 'js'} *-->)([\\s\\S]*?)(<!-- *endinjector *-->))`;

    if (typeof parameters.filter === 'function') {
      parameter.filter = parameters.filter;
    } else {
      parameter.filter = () => true;
    }
    
    if (typeof parameters.template === 'function') {
      parameter.template = parameters.template;
    } else {
      parameter.template = assetName => assetName;
    }

    this._parameters.push(parameter);
  }
}

SimpleInjectorWebpackPlugin['default'] = SimpleInjectorWebpackPlugin;
module.exports = SimpleInjectorWebpackPlugin;
