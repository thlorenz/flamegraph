'use strict';

var detectInputType = require('./lib/detect-inputtype')
  , stackCollapse   = require('./lib/stackcollapse')
  , svg             = require('./lib/svg')
  , defaultOpts     = require('./lib/default-opts')
  , defaultOptsMeta = require('./lib/default-opts-meta')
  , filterInternals = require('./lib/filter-internals')
  , filterLazy      = require('./lib/filter-lazycompile')

exports = module.exports =

/**
 * Converts an array of call graph lines into an svg document.
 * If `opts.inputtype` is not given it will be detected from the input.
 *
 * @name flamegraph
 * @function
 * @param {Array.<string>} arr      input lines to render svg for
 * @param {Object} opts objects that affect the visualization
 * @param {string} opts.inputtype       the type of callgraph `instruments | perf`
 * @param {string} opts.fonttype        type of font to use               default: `'Verdana'`
 * @param {number} opts.fontsize        base text size                    default: `12`
 * @param {number} opts.imagewidth      max width, pixels                 default: `1200`
 * @param {number} opts.frameheight     max height is dynamic             default: `16.0`
 * @param {number} opts.fontwidth       avg width relative to fontsize    default: `0.59`
 * @param {number} opts.minwidth        min function width, pixels        default: `0.1`
 * @param {string} opts.countname       what are the counts in the data?  default: `'samples'`
 * @param {string} opts.colors          color theme                       default: `'hot'`
 * @param {string} opts.bgcolor1        background color gradient start   default: `'#eeeeee'`
 * @param {string} opts.bgcolor2        background color gradient stop    default: `'#eeeeb0'`
 * @param {number} opts.timemax         (override the) sum of the counts  default: `Infinity`
 * @param {number} opts.factor          factor to scale counts by         default: `1`
 * @param {boolean} opts.hash           color by function name            default: `true`
 * @param {string} opts.titletext       centered heading                  default: `'Flame Graph'`
 * @param {string} opts.nametype        what are the names in the data?   default: `'Function:'`
 * @param {boolean} opts.keepOptimizationInfo keep function optimization information  default: `false`
 * @param {boolean} opts.internals  keep internal methods             default: `false`
 * @return {string} svg                 the rendered svg
 */
function flamegraph(arr, opts) {
  if (!Array.isArray(arr)) throw new TypeError('First arg needs to be an array of lines.');

  opts = opts || {};
  var collapsed = stackCollapseFromArray(arr, opts);
  collapsed = filterLazy(collapsed, opts);
//  if (!opts.internals) collapsed = filterInternals(collapsed, opts);
  return svg(collapsed, opts);
}

var stackCollapseFromArray = exports.stackCollapseFromArray = 

/**
 * Collapses a callgraph inside a given lines array line by line.
 * 
 * @name flamegraph::stackCollapseFromArray
 * @function
 * @param {Object=} opts
 * @param {string=} opts.inputtype the type of input to collapse (if not supplied it is detected from the input)
 * @param {boolean} opts.internals  keep internal methods default: `false`
 * @param {Array.<string>} arr lines to collapse
 * @return {Array.<string>} array of collapsed lines
 */
function stackCollpaseFromArray (arr, opts) {
  if (!Array.isArray(arr)) throw new TypeError('First arg needs to be an array of lines.');

  opts = opts || {};
  opts.inputtype = opts.inputtype || detectInputType(arr);
  if (!opts.inputtype) throw new Error('No input type given and unable to detect it for the given input!');

  return stackCollapse(opts, arr);
}

exports.stackCollapse   = stackCollapse;
exports.svg             = svg;
exports.defaultOpts     = defaultOpts;
exports.defaultOptsMeta = defaultOptsMeta;
