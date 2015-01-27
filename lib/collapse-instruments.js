'use strict';

var isInternal = require('./is-internal');
var regexp = /(\d+)\.\d+ms[^,]+,\d+,\s+,(\s*)(.+)/;

function addFrame(f) {
  return f ? f + ';' : ';';
}

function InstrumentsCollapser(opts) {
  if (!(this instanceof InstrumentsCollapser)) return new InstrumentsCollapser(opts);

  opts = opts || {};
  this.stack = [];
  this.collapsed = [];
  this._skipInternals = !opts.internals;
  this._skippedMilliSeconds = 0;
}

module.exports = InstrumentsCollapser;
var proto = InstrumentsCollapser.prototype;

proto.collapseLine = function collapseLine(line) {
  var matches = line.match(regexp);
  if (!matches || !matches.length) return;

  var ms    = matches[1];
  var depth = matches[2].length;

  var fn    = matches[3];

  //if (this._skipInternals && isInternal(fn)) fn = '__internal__';
  if (this._skipInternals && isInternal(fn)) { 
    this._skippedMilliSeconds += ms;
    return;
  }

  this.stack[depth] = fn;

  var res = '';
  for (var i = 0; i < depth; i++) res += addFrame(this.stack[i])
    
  res += fn + ' ' + ms + '\n';

  this.collapsed.push(res.trim('\n'));
}

proto.collapsedLines = function () {
  return this.collapsed;
}
//
// Test
var fs = require('fs')
  , path = require('path');
function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}
if (!module.parent && typeof window === 'undefined') {
  var fixtures = path.join(__dirname, '..', 'test', 'fixtures') 
  var input = fs.readFileSync(fixtures + '/instruments-part1.csv', 'utf8')
  var c = new InstrumentsCollapser();
  input.split('\n').forEach(c.collapseLine.bind(c));
  inspect(c.collapsedLines());
}
