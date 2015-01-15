'use strict';

var xtend           = require('xtend')
  , parseInput      = require('./stackparse')
  , contextify      = require('./contextify')
  , svgTemplate     = require('./svg-template')
  , defaultOpts     = require('./default-opts')

// TODO: to keep simple svg generation working remove nodes marked narrow when option is provided
function narrowify(context, opts) {
  function processNode(n) {
    n.class = n.narrow ? 'hidden' : '';
  }

  context.nodes.forEach(processNode);
}

var go = module.exports = 

/**
 * Creates a context from a call graph that has been collapsed (`stackcollapse-*`) and renders svg from it.
 * 
 * @name flamegraph::svg 
 * @function
 * @param {Array.<string>} collapsedLines callgraph that has been collapsed
 * @param {Object} opts options
 * @return {string} svg 
 */
function svg(collapsedLines, opts) {
  opts = xtend(defaultOpts, opts);

  var parsed = parseInput(collapsedLines)
  var context = contextify(parsed, opts)

  narrowify(context, opts);

  return svgTemplate(context);
}
