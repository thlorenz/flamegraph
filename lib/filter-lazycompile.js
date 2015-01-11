'use strict';

var v8LazyCompileRegex = /LazyCompile:/g
var v8LazyCompileInlineInfoRegex = /LazyCompile:[~*]{0,1}/g

var go = module.exports = function filterLazyCompile(collapsed, opts) {
  opts = opts || {};
  var v8LazyRegex = opts.optimizationinfo ? v8LazyCompileRegex : v8LazyCompileInlineInfoRegex;
  var v8LazyReplacement = opts.optimizationinfo ? '' : '-';

  function filterLine(l) {
    return l.replace(v8LazyRegex, v8LazyReplacement)
  }

  return collapsed.map(filterLine);  
}
