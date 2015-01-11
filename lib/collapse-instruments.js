'use strict';

var regexp = /(\d+)\.\d+ms[^,]+,\d+,\s+,(\s*)(.+)/;

function addFrame(f) {
  return f + ';';
}

function InstrumentsCollapser() {
  if (!(this instanceof InstrumentsCollapser)) return new InstrumentsCollapser();

  this.stack = [];
  this.collapsed = [];
}

module.exports = InstrumentsCollapser;
var proto = InstrumentsCollapser.prototype;

proto.collapseLine = function collapseLine(line) {
  var matches = line.match(regexp);
  if (!matches || !matches.length) return;

  var ms    = matches[1];
  var depth = matches[2].length;

  var fn    = matches[3];
  this.stack[depth] = fn;

  var res = '';
  for (var i = 0; i < depth; i++) res += addFrame(this.stack[i])
    
  res += fn + ' ' + ms + '\n';

  this.collapsed.push(res.trim('\n'));
}

proto.collapsedLines = function () {
  return this.collapsed;
}
