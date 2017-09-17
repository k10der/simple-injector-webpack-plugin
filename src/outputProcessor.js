'use strict';
const fs = require('fs');

const async = require('async');

class OutputProcessor {
  constructor() {
    this.process = this.process.bind(this);
  }

  process(configurations, compilation, cb) {
    const outputs = {};
    const entryPoints = Object.keys(compilation.entrypoints).map(ep => compilation.entrypoints[ep]);

    for (let c of configurations) {
      if (!outputs.hasOwnProperty(c.file)) {
        outputs[c.file] = {
          eol: c.eol,
          re: c.re,
          strings: [],
        };
      }

      for (let ep of c.sort(entryPoints)) {
        for (let ch of ep.chunks) {
          for (let f of ch.files) {
            if (!c.filter || c.filter(f)) {
              let str = c.template(f);
              if (outputs[c.file].strings.indexOf(str) === -1) {
                outputs[c.file].strings.push(str);
              }
            }
          }
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
  }

}

OutputProcessor['default'] = OutputProcessor;
module.exports = OutputProcessor;
