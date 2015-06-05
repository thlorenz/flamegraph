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
  , string: [ 't', 'inputtype', 'm', 'map', 'f', 'file', 'o', 'output' ]
  }
);

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

if (argv.h || argv.help) return usage();

var input = process.stdin;
if (argv.f || argv.file)
  input = fs.createReadStream(argv.f || argv.file);

var output = process.stdout;
if (argv.o || argv.output)
  output = fs.createWriteStream(argv.o || argv.output);

if (argv.m || argv.map)
  argv.profile = { map: fs.readFileSync(argv.m || argv.map).toString() };

flamegraphFromStream(input, argv).pipe(output);
