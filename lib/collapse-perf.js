'use strict';

var format = require('util').format;
var includePname = true;


function PerfCollapser(opts) {
  if (!(this instanceof PerfCollapser)) return new PerfCollapser(opts);

  this.includePname = typeof opts.includePname === 'undefined' ? true : opts.includePname
  this.pname = undefined;
  this.collapsed = {};
}

module.exports = PerfCollapser;

var proto = PerfCollapser.prototype;

proto.rememberStack = function rememberStack(stack, count) {
  if (!this.collapsed[stack]) this.collapsed[stack] = 0;
  this.collapsed[stack] += count;
}

proto.perfCollapseLine = function perfCollapseLine(stack, line) {
  var func, mod;

  // ignore comments
  if (/^#/.test(line)) return;

  // empty lines
  if (!line.length) {
    if (this.pname) stack.unshift(this.pname);
    if (stack && stack.length) this.rememberStack(stack.join(';'), 1);
    return;
  }

  // lines containing process name
  var matches = line.match(/^(\S+)\s/);
  if (!matches || !matches.length) {
    if (this.includePname) this.pname = matches[1];
    return;
  }

  matches = line.match(/^\s*\w+\s*(.+) (\S+)/);
  if (!matches || !matches.length) {
    func = matches[1];
    mod = matches[2];
    
    // skip process names
    if ((/^\(/).test(func)) return; 
    stack.unshift(func);
    return;
  }

  console.warn('Unrecognized line: ', line);
}

proto.collapsedLines = function collapsedLines() {
  var collapsed = this.collapsed;
  return Object.keys(collapsed)
    .map(function (k) {
      return format('%s %s', k, collapsed[k]);
    })
}
