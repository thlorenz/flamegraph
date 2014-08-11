'use strict';

var format = require('util').format;
var includePname = true;


function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

function PerfCollapser(opts) {
  if (!(this instanceof PerfCollapser)) return new PerfCollapser(opts);

  opts = opts || {};
  this.includePname = typeof opts.includePname === 'undefined' ? true : opts.includePname
  this.stack = undefined;
  this.pname = undefined;
  this.collapsed = {};
}

module.exports = PerfCollapser;

var proto = PerfCollapser.prototype;

proto.rememberStack = function rememberStack(joinedStack, count) {
  if (!this.collapsed[joinedStack]) this.collapsed[joinedStack] = 0;
  this.collapsed[joinedStack] += count;
}

proto.unshiftStack = function unshiftStack(val) {
  if (!this.stack) this.stack = [ val ];
  else this.stack.unshift(val);
}

proto.collapseLine = function perfCollapseLine(line) {
  var func, mod;

  // ignore comments
  if (/^#/.test(line)) return;

  // empty lines
  if (!line.length) {
    if (this.pname) this.unshiftStack(this.pname);
    if (this.stack) this.rememberStack(this.stack.join(';'), 1);
    this.stack = undefined;
    this.pname = undefined;
    return;
  }

  // lines containing process name
  var matches = line.match(/^(\S+)\s/);
  if (matches && matches.length) {
    if (this.includePname) this.pname = matches[1];
    return;
  }

  matches = line.match(/^\s*\w+\s*(.+) (\S+)/);
  if (matches && matches.length) {
    func = matches[1];
    
    // skip process names
    if ((/^\(/).test(func)) return; 

    this.unshiftStack(func);
    return;
  }

  console.warn('Unrecognized line: "%s"', line);
}

proto.collapsedLines = function collapsedLines() {
  var collapsed = this.collapsed;
  return Object.keys(collapsed)
    .sort(function (a, b) { return a < b ? -1 : 1 })
    .map(function (k) {
      return format('%s %s', k, collapsed[k]);
    })
}
