'use strict';

var regexp = /(\d+)\.\d+ms[^,]+,\d+,\s+,(\s*)(.+)/;
var split = require('split2');
var stream = require('readable-stream');

function addFrame(f) {
  return f + ';';
}

function collapseLine(stack, line) {
  var matches = line.match(regexp);
  if (!matches || !matches.length) return;

  var ms    = matches[1];
  var depth = matches[2].length;
  var fn    = matches[3];
  stack[depth] = fn;

  var res = '';
  for (var i = 0; i < depth; i++) res += addFrame(stack[i])
    
  res += fn + ' ' + ms + '\n';

  return res;
}

var go = module.exports = 

/**
 * Collapses a callgraph inside an Instruments generated `.csv` file line by line.
 * 
 * @name flamegraph#stackCollapseInstruments
 * @function
 * @return {TransformStream} stream into which to pipe the lines of the `.csv` file 
 */
function stackCollapseInstruments() {
  var stack = [];
  var pt = new stream.PassThrough();

  function processLine(line) {
    return collapseLine(stack, line);
  }

  return pt.pipe(split(processLine))
}
