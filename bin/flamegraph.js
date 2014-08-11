#!/usr/bin/env node
'use strict';

var minimist =  require('minimist')
  , flamegraphFromStream = require('../from-stream')
  , path = require('path')
  , fs = require('fs');

function usage() {
  var usageFile = path.join(__dirname, 'usage.txt');
  fs.createReadStream(usageFile).pipe(process.stdout);
  return;
}

var argv = minimist(process.argv.slice(2)
  , { boolean: [ 'h', 'help' ] 
    , string: [ 't', 'inputtype' ]
    }
);

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

if (argv.h || argv.help) return usage();

flamegraphFromStream(process.stdin, argv).pipe(process.stdout)
