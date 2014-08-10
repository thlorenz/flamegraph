'use strict';

var regexp = /(\d+)\.\d+ms[^,]+,\d+,\s+,(\s*)(.+)/;

function addFrame(f) {
  return f + ';';
}

module.exports = function collapseLine(stack, line) {
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

