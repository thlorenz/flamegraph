(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/thlorenz/dev/js/flamegraph/index.js":[function(require,module,exports){
'use strict';

var detectInputType = require('./lib/detect-inputtype')
  , stackCollapse   = require('./lib/stackcollapse')
  , svg             = require('./lib/svg')
  , defaultOpts     = require('./lib/default-opts')
  , defaultOptsMeta = require('./lib/default-opts-meta');

exports = module.exports =

/**
 * Converts an array of call graph lines into an svg document.
 * If `opts.inputtype` is not given it will be detected from the input.
 *
 * @name flamegraph
 * @function
 * @param {Array.<string>} arr      input lines to render svg for
 * @param {Object} opts objects that affect the visualization
 * @param {string} opts.inputtype   the type of callgraph `instruments | perf`
 * @param {string} opts.fonttype    type of font to use               default: `'Verdana'`
 * @param {number} opts.fontsize    base text size                    default: `12`
 * @param {number} opts.imagewidth  max width, pixels                 default: `1200`
 * @param {number} opts.frameheight max height is dynamic             default: `16.0`
 * @param {number} opts.fontwidth   avg width relative to fontsize    default: `0.59`
 * @param {number} opts.minwidth    min function width, pixels        default: `0.1`
 * @param {string} opts.countname   what are the counts in the data?  default: `'samples'`
 * @param {string} opts.colors      color theme                       default: `'hot'`
 * @param {string} opts.bgcolor1    background color gradient start   default: `'#eeeeee'`
 * @param {string} opts.bgcolor2    background color gradient stop    default: `'#eeeeb0'`
 * @param {number} opts.timemax     (override the) sum of the counts  default: `Infinity`
 * @param {number} opts.factor      factor to scale counts by         default: `1`
 * @param {boolean} opts.hash       color by function name            default: `true`
 * @param {string} opts.titletext   centered heading                  default: `'Flame Graph'`
 * @param {string} opts.nametype    what are the names in the data?   default: `'Function:'`
 * @return {string} svg             the rendered svg
 */
function flamegraph(arr, opts) {
  if (!Array.isArray(arr)) throw new TypeError('First arg needs to be an array of lines.');

  opts = opts || {};
  var collapsed = stackCollapseFromArray(arr, opts.inputtype);
  return svg(collapsed, opts);
}

var stackCollapseFromArray = exports.stackCollapseFromArray = 

/**
 * Collapses a callgraph inside a given lines array line by line.
 * 
 * @name flamegraph::stackCollapseFromArray
 * @function
 * @param {string} type the type of input to collapse (if not supplied it is detected from the input)
 * @param {Array.<string>} arr lines to collapse
 * @return {Array.<string>} array of collapsed lines
 */
function stackCollpaseFromArray (arr, inputType) {
  if (!Array.isArray(arr)) throw new TypeError('First arg needs to be an array of lines.');

  inputType = inputType || detectInputType(arr);
  if (!inputType) throw new Error('No input type given and unable to detect it for the given input!');

  return stackCollapse(inputType, arr);
}

exports.stackCollapse   = stackCollapse;
exports.svg             = svg;
exports.defaultOpts     = defaultOpts;
exports.defaultOptsMeta = defaultOptsMeta;

},{"./lib/default-opts":"/Users/thlorenz/dev/js/flamegraph/lib/default-opts.js","./lib/default-opts-meta":"/Users/thlorenz/dev/js/flamegraph/lib/default-opts-meta.js","./lib/detect-inputtype":"/Users/thlorenz/dev/js/flamegraph/lib/detect-inputtype.js","./lib/stackcollapse":"/Users/thlorenz/dev/js/flamegraph/lib/stackcollapse.js","./lib/svg":"/Users/thlorenz/dev/js/flamegraph/lib/svg.js"}],"/Users/thlorenz/dev/js/flamegraph/lib/collapse-instruments.js":[function(require,module,exports){
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

},{}],"/Users/thlorenz/dev/js/flamegraph/lib/collapse-perf.js":[function(require,module,exports){
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

},{"util":"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/util/util.js"}],"/Users/thlorenz/dev/js/flamegraph/lib/color-map.js":[function(require,module,exports){
'use strict';

var format = require('util').format;

function scalarReverse(s) {
  return s.split('').reverse().join('');
}

function nameHash(name) {
	// Generate a vector hash for the name string, weighting early over
	// later characters. We want to pick the same colors for function
	// names across different flame graphs.
	var vector = 0
	  , weight = 1
	  , max = 1
	  , mod = 10
	  , ord

	// if module name present, trunc to 1st char
  name = name.replace(/.(.*?)`/, '');
  var splits = name.split('');
  for (var i = 0; i < splits.length; i++) {
    ord = splits[i].charCodeAt(0) % mod;
    vector += (ord / (mod++ - 1)) * weight;
    max += weight;
    weight *= 0.70;
    if (mod > 12) break;
  }
	 
  return (1 - vector / max);
}

function color(type, hash, name) {
  var v1, v2, v3, r, g, b;
  if (!type) return 'rgb(0, 0, 0)';

  if (hash) {
    v1 = nameHash(name);
    v2 = v3 = nameHash(scalarReverse(name));
  } else {
		v1 = Math.random() + 1;
		v2 = Math.random() + 1;
		v3 = Math.random() + 1;
  }

  switch(type) {
    case 'hot':
      r = 205 + Math.round(50 * v3);
      g = 0 + Math.round(230 * v1);
      b = 0 + Math.round(55 * v2);
      return format('rgb(%s, %s, %s)',r, g, b);
    case 'mem':
      r = 0;
      g = 190 + Math.round(50 * v2);
      b = 0 + Math.round(210 * v1);
      return format('rgb(%s, %s, %s)',r, g, b);
    case 'io':
      r = 80 + Math.round(60 * v1);
      g = r;
      b = 190 + Math.round(55 * v2);
      return format('rgb(%s, %s, %s)',r, g, b);
    default:
      throw new Error('Unknown type ' + type);
  }
}

module.exports = 

/**
 * Maps a function name to a color, while trying to create same colors for similar functions.
 * 
 * @name colorMap
 * @function
 * @private
 * @param {Object.<string, string>} paletteMap current map of colors `func: color`
 * @param {string} colorTheme theme of colors to be used `hot | mem | io`
 * @param {boolean} hash if true colors will be created from name hash, otherwise they are random
 * @param {string} func the function name for which to select a color
 * @return {string} containing an rgb color, i.e. `'rgb(1, 2, 3)'`
 */
function colorMap(paletteMap, colorTheme, hash, func) {
  if (paletteMap[func]) return paletteMap[func];
  paletteMap[func] = color(colorTheme, hash, func);
  return paletteMap[func];
}

},{"util":"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/util/util.js"}],"/Users/thlorenz/dev/js/flamegraph/lib/contextify.js":[function(require,module,exports){
'use strict';

var xtend = require('xtend')
  , format = require('util').format
  , colorMap = require('./color-map')

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

function oneDecimal(x) {
  return (Math.round(x * 10) / 10);
}

function htmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

module.exports = 
  
/**
 * Extracts a context object from the parsed callgraph @see `stackparse.js`.
 * This context can then be used to generate the svg file via a template.
 * 
 * @name contextify
 * @private
 * @function
 * @param {Object} parsed nodes
 * @param {Object} opts options that affect visual and how the nodes are filtered
 */
function contextify(parsed, opts) {
  var time       = parsed.time
    , timeMax    = opts.timemax
    , ypadTop    = opts.fontsize * 4           // pad top, include title
    , ypadBottom = opts.fontsize * 2 + 10      // pad bottom, include labels
    , xpad       = 10                          // pad left and right
    , depthMax   = 0
    , frameHeight = opts.frameheight
    , paletteMap = {}

  if (timeMax < time && timeMax/time > 0.02) {
    console.error('Specified timemax %d is less than actual total %d, so it will be ignored', timeMax, time);
    timeMax = Infinity;
  }

  timeMax = Math.min(time, timeMax);

  var widthPerTime = (opts.imagewidth - 2 * xpad) / timeMax
    , minWidthTime = opts.minwidth / widthPerTime

  function pruneNarrowBlocks() {

    function nonNarrowBlock(acc, k) {
      var val = parsed.nodes[k];
      if (typeof val.stime !== 'number') throw new Error('Missing start for ' + k);
      if ((val.etime - val.stime) < minWidthTime) return acc;

      acc[k] = parsed.nodes[k];
      depthMax = Math.max(val.depth, depthMax);
      return acc;
    }

    return Object.keys(parsed.nodes).reduce(nonNarrowBlock, {});
  }


  function processNode(node) {
    var func  = node.func
      , depth = node.depth
      , etime = node.etime
      , stime = node.stime
      , factor = opts.factor
      , countName = opts.countname
      , isRoot = !func.length && depth === 0
    ;

    if (isRoot) etime = timeMax;
    
    var samples = Math.round((etime - stime * factor) * 10) / 10
      , samplesTxt = samples.toLocaleString()
      , pct
      , pctTxt
      , escapedFunc
      , name
      , sampleInfo

    if (isRoot) {
      name = 'all';
      sampleInfo = format('(%s %s, 100%)', samplesTxt, countName);
    } else {
      pct = Math.round((100 * samples) / (timeMax * factor) * 10) / 10
      pctTxt = pct.toLocaleString()
      escapedFunc = htmlEscape(func);

      name = escapedFunc;
      sampleInfo = format('(%s %s), %s%%)', samplesTxt, countName, pctTxt);
    }

    var x1 = oneDecimal(xpad + stime * widthPerTime)
      , x2 = oneDecimal(xpad + etime * widthPerTime)
      , y1 = oneDecimal(imageHeight - ypadBottom - (depth + 1) * frameHeight + 1)
      , y2 = oneDecimal(imageHeight - ypadBottom - depth * frameHeight)
      , chars = (x2 - x1) / (opts.fontsize * opts.fontwidth)
      , showText = false
      , text
      , text_x
      , text_y

    if (chars >= 3 ) { // enough room to display function name?
      showText = true;
      text = func.slice(0, chars);
      if (chars < func.length) text = text.slice(0, chars - 2) + '..';
      text = htmlEscape(text);
    }

    return {
        name      : name
      , samples   : sampleInfo
      , rect_x    : x1
      , rect_y    : y1
      , rect_w    : x2 - x1
      , rect_h    : y2 - y1
      , rect_fill : colorMap(paletteMap, opts.colors, opts.hash, func)
      , showText  : showText
      , text      : text
      , text_x    : x1 + 3
      , text_y    : 3 + (y1 + y2) / 2
    }
  }

  var nodes = pruneNarrowBlocks();

  var imageHeight = (depthMax * frameHeight) + ypadTop + ypadBottom;
  var ctx = xtend(opts, {
      imageheight : imageHeight
    , xpad        : xpad
    , titleX      : opts.imagewidth / 2
    , detailsY    : imageHeight - (frameHeight / 2) 
  });

  ctx.nodes = Object.keys(nodes)
    .reduce(function (acc, k) {
      acc.push(processNode(nodes[k]));
      return acc;
    }, []);
  return ctx;
} 

},{"./color-map":"/Users/thlorenz/dev/js/flamegraph/lib/color-map.js","util":"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/util/util.js","xtend":"/Users/thlorenz/dev/js/flamegraph/node_modules/xtend/immutable.js"}],"/Users/thlorenz/dev/js/flamegraph/lib/default-opts-meta.js":[function(require,module,exports){
'use strict';

module.exports = {
    fonttype    : { type : 'string'  , description : 'Font Type'                                       }
  , fontsize    : { type : 'range'   , description : 'Font Size'  , min: 6, max: 22, step: 0.1         }
  , imagewidth  : { type : 'range'  , description : 'Image Width' , min: 200, max: 2400, step: 5       }
  , frameheight : { type : 'range'  , description : 'Frame Height', min: 6, max: 40, step: 0.1         }
  , fontwidth   : { type : 'range'  , description : 'Font Width', min: 0.2, max: 1.0, step: 0.05       }
  , minwidth    : { type : 'range'  , description : 'Min Function Width', min: 0.1, max: 30, step: 0.1 }
  , countname   : { type : 'string'  , description : 'Count Name'                                      }
  , colors      : { type : 'string'  , description : 'Color Theme'                                     }
  , bgcolor1    : { type : 'color'   , description : 'Gradient start'                                  }
  , bgcolor2    : { type : 'color'   , description : 'Gradient stop'                                   }
  , timemax     : { type : 'number'  , description : 'Time Max'                                        }
  , factor      : { type : 'number'  , description : 'Scaling Factor'                                  }
  , hash        : { type : 'boolean' , description : 'Color by Function Name'                          }
  , titlestring : { type : 'string'  , description : 'Title'                                           }
  , nametype    : { type : 'string'  , description : 'Name'                                            }
}

},{}],"/Users/thlorenz/dev/js/flamegraph/lib/default-opts.js":[function(require,module,exports){
'use strict';

module.exports = {
    fonttype    : 'Verdana'     // font type
  , fontsize    : 12            // base text size
  , imagewidth  : 1200          // max width, pixels
  , frameheight : 16.0          // max height is dynamic  
  , fontwidth   : 0.59          // avg width relative to fontsize
  , minwidth    : 0.1           // min function width, pixels
  , countname   : 'samples'     // what are the counts in the data?
  , colors      : 'hot'         // color theme
  , bgcolor1    : '#eeeeee'     // background color gradient start
  , bgcolor2    : '#eeeeb0'     // background color gradient stop
  , timemax     : Infinity      // (override the) sum of the counts
  , factor      : 1             // factor to scale counts by
  , hash        : true          // color by function name
  , titletext   : 'Flame Graph' // centered heading
  , nametype    : 'Function:'   // what are the names in the data?

  // below are not supported at this point
  , palette     : false         // if we use consistent palettes (default off)
  , palette_map : {}            // palette map hash
  , pal_file    : 'palette.map' // palette map file name
}

},{}],"/Users/thlorenz/dev/js/flamegraph/lib/detect-inputtype.js":[function(require,module,exports){
'use strict';

var instrumentsRegex = /^Running Time, *Self,.*, *Symbol Name/;

// node 22610 13108.211038: cpu-clock:u: 
var perfRegex = /^\w+ +\d+ +\d+\.\d+:/;

function firstLine(arr) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].length) return arr[i];
  }
}

var go = module.exports = function (arr) {
  var first = firstLine(arr);
  if (!first) return null;

  if (instrumentsRegex.test(first)) return 'instruments';
  if (perfRegex.test(first)) return 'perf';

  return null;
}

},{}],"/Users/thlorenz/dev/js/flamegraph/lib/stackcollapse.js":[function(require,module,exports){
'use strict';

var instruments = require('./collapse-instruments')
  , perf = require('./collapse-perf')

function getCollapser(type) {
  switch(type) {
    case 'instruments':
      return instruments()
    case 'perf':
      return perf()
    default:
      throw new Error('Unknown type, cannot collapse "' + type + '"'); 
  }
}

exports = module.exports = 

/**
 * Collapses a callgraph inside a given lines array line by line.
 * 
 * @name flamegraph::stackCollapse.array
 * @private
 * @function
 * @param {string} type the type of input to collapse
 * @param {Array.<string>} arr lines to collapse
 * @return {Array.<string>} array of collapsed lines
 */
function stackCollapse(type, arr) {
  var collapser = getCollapser(type);

  function online (line) {
    collapser.collapseLine(line);
  }

  function nonEmpty(line) {
    return line && line.length;
  }

  arr.forEach(online);

  return collapser.collapsedLines().filter(nonEmpty);
}

},{"./collapse-instruments":"/Users/thlorenz/dev/js/flamegraph/lib/collapse-instruments.js","./collapse-perf":"/Users/thlorenz/dev/js/flamegraph/lib/collapse-perf.js"}],"/Users/thlorenz/dev/js/flamegraph/lib/stackparse.js":[function(require,module,exports){
'use strict';

var regexp = /^(.*)\s+(\d+(?:\.\d*)?)$/;

function lexically(a, b) {
  return  a < b ? -1 
        : b < a ?  1 : 0;
}

function sort(functions) {
  return functions.sort(lexically);
}

function flow(tmp, nodes, last, frames, time) {

  var lenLast = last.length - 1
    , lenFrames = frames.length - 1
    , i
    , lenSame
    , k

  for(i = 0; i <= lenLast; i++) {
    if (i > lenFrames) break;
    if (last[i] !== frames[i]) break;
  }
  lenSame = i;

  for(i = lenLast; i >= lenSame; i--) {
    k = last[i] + ';' + i;
		// a unique ID is constructed from "func;depth;etime";
		// func-depth isn't unique, it may be repeated later.
    nodes[k + ';' + time] = { func: last[i], depth: i, etime: time, stime: tmp[k].stime }
    tmp[k] = null;
  }

  for(i = lenSame; i <= lenFrames; i++) {
    k = frames[i]+ ';' + i;
    tmp[k] = { stime: time };
  }
}

function trimLine(line) {
  return line.trim();
}

function nonempty(line) {
  return line.length;
}

module.exports = 

/**
 * Parses collapsed lines into a nodes array.
 * 
 * @name parseInput
 * @private
 * @function
 * @param {Array.<string>} lines collapsed callgraph
 * @return {Object}  
 *  - nodes: array of nodes, one for each line 
 *  - time: total execution time
 *  - ignored: how many lines where ignored
 */
function parseInput(lines) {
  var ignored = 0
    , time = 0
    , last = []
    , tmp = {}
    , nodes = {}
    ;

  function processLine(line) {
    var frames;

    var matches = line.match(regexp);
    if (!matches || !matches.length) return;

    var stack   = matches[1];
    var samples = matches[2];

    if (!samples) {
      ignored++;
      return;
    }

    stack = stack.replace(/<>/g, '()');
    frames = stack.split(';');

    flow(tmp, nodes, last, frames, time);
    time += parseInt(samples, 10);

    last = frames;
  }

  sort(
    lines
      .map(trimLine)
      .filter(nonempty)
    )
    .forEach(processLine);

  flow(tmp, nodes, last, [], time);

  if (ignored) console.error('Ignored %d lines with invalid format');
  if (!time) throw new Error('No stack counts found!');

  return { nodes: nodes, time: time, ignored: ignored };
}


},{}],"/Users/thlorenz/dev/js/flamegraph/lib/svg-client-template.js":[function(require,module,exports){
'use strict';

// resolved via hbsfy transform

module.exports = require('./svg.hbs');

},{"./svg.hbs":"/Users/thlorenz/dev/js/flamegraph/lib/svg.hbs"}],"/Users/thlorenz/dev/js/flamegraph/lib/svg.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<g class=\"func_g\" onmouseover=\"s('";
  stack1 = ((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helper = (helper = helpers.samples || (depth0 != null ? depth0.samples : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"samples","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "')\" onmouseout=\"c()\">\n<title>";
  stack1 = ((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helper = (helper = helpers.samples || (depth0 != null ? depth0.samples : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"samples","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "</title>\n  <rect x=\""
    + escapeExpression(((helper = (helper = helpers.rect_x || (depth0 != null ? depth0.rect_x : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_x","hash":{},"data":data}) : helper)))
    + "\" y=\""
    + escapeExpression(((helper = (helper = helpers.rect_y || (depth0 != null ? depth0.rect_y : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_y","hash":{},"data":data}) : helper)))
    + "\" width=\""
    + escapeExpression(((helper = (helper = helpers.rect_w || (depth0 != null ? depth0.rect_w : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_w","hash":{},"data":data}) : helper)))
    + "\" height=\""
    + escapeExpression(((helper = (helper = helpers.rect_h || (depth0 != null ? depth0.rect_h : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_h","hash":{},"data":data}) : helper)))
    + "\" fill=\""
    + escapeExpression(((helper = (helper = helpers.rect_fill || (depth0 != null ? depth0.rect_fill : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_fill","hash":{},"data":data}) : helper)))
    + "\" rx=\"2\" ry=\"2\" />\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.showText : depth0), {"name":"if","hash":{},"fn":this.program(2, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n</g>\n";
},"2":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda, buffer = "<text text-anchor=\"\" x=\""
    + escapeExpression(((helper = (helper = helpers.text_x || (depth0 != null ? depth0.text_x : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text_x","hash":{},"data":data}) : helper)))
    + "\" y=\""
    + escapeExpression(((helper = (helper = helpers.text_y || (depth0 != null ? depth0.text_y : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text_y","hash":{},"data":data}) : helper)))
    + "\" font-size=\""
    + escapeExpression(lambda((depths[2] != null ? depths[2].fontsize : depths[2]), depth0))
    + "\" font-family=\""
    + escapeExpression(lambda((depths[2] != null ? depths[2].fonttype : depths[2]), depth0))
    + "\" fill=\"rgb(0,0,0)\">";
  stack1 = ((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</text>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<?xml version=\"1.0\" standalone=\"no\"?>\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" width=\""
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + "\" height=\""
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\" onload=\"init(evt)\" viewBox=\"0 0 "
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + " "
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n<defs>\n	<linearGradient id=\"background\" y1=\"0\" y2=\"1\" x1=\"0\" x2=\"0\">\n    <stop stop-color=\""
    + escapeExpression(((helper = (helper = helpers.bgcolor1 || (depth0 != null ? depth0.bgcolor1 : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"bgcolor1","hash":{},"data":data}) : helper)))
    + "\" offset=\"5%\" />\n    <stop stop-color=\""
    + escapeExpression(((helper = (helper = helpers.bgcolor2 || (depth0 != null ? depth0.bgcolor2 : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"bgcolor2","hash":{},"data":data}) : helper)))
    + "\" offset=\"95%\" />\n	</linearGradient>\n</defs>\n<style type=\"text/css\">\n	.func_g:hover { stroke:black; stroke-width:0.5; }\n</style>\n<script type=\"text/javascript\">\n	var details;\n	function init(evt) { details = document.getElementById(\"details\").firstChild; }\n  function s(info) { details.nodeValue = \""
    + escapeExpression(((helper = (helper = helpers.nametype || (depth0 != null ? depth0.nametype : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"nametype","hash":{},"data":data}) : helper)))
    + ": \" + info; }\n	function c() { details.nodeValue = ' '; }\n</script>\n\n<rect x=\"0.0\" y=\"0\" width=\""
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + "\" height=\""
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\" fill=\"url(#background)\"  />\n<text text-anchor=\"middle\" x=\""
    + escapeExpression(((helper = (helper = helpers.titleX || (depth0 != null ? depth0.titleX : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"titleX","hash":{},"data":data}) : helper)))
    + "\" y=\"24\" font-size=\"17\" font-family=\""
    + escapeExpression(((helper = (helper = helpers.fonttype || (depth0 != null ? depth0.fonttype : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fonttype","hash":{},"data":data}) : helper)))
    + "\" fill=\"rgb(0,0,0)\">";
  stack1 = ((helper = (helper = helpers.titletext || (depth0 != null ? depth0.titletext : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"titletext","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "</text>\n<text text-anchor=\"left\" x=\""
    + escapeExpression(((helper = (helper = helpers.xpad || (depth0 != null ? depth0.xpad : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"xpad","hash":{},"data":data}) : helper)))
    + "\" y=\""
    + escapeExpression(((helper = (helper = helpers.detailsY || (depth0 != null ? depth0.detailsY : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"detailsY","hash":{},"data":data}) : helper)))
    + "\" font-size=\""
    + escapeExpression(((helper = (helper = helpers.fontsize || (depth0 != null ? depth0.fontsize : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fontsize","hash":{},"data":data}) : helper)))
    + "\" font-family=\""
    + escapeExpression(((helper = (helper = helpers.fonttype || (depth0 != null ? depth0.fonttype : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fonttype","hash":{},"data":data}) : helper)))
    + "\" fill=\"rgb(0,0,0)\" id=\"details\"> </text>\n\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.nodes : depth0), {"name":"each","hash":{},"fn":this.program(1, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n</svg>\n";
},"useData":true,"useDepths":true});

},{"hbsfy/runtime":"/Users/thlorenz/dev/js/flamegraph/node_modules/hbsfy/runtime.js"}],"/Users/thlorenz/dev/js/flamegraph/lib/svg.js":[function(require,module,exports){
'use strict';

var xtend = require('xtend')
  , parseInput = require('./stackparse')
  , contextify = require('./contextify')
  , svgTemplate = require('./svg-template')
  , defaultOpts = require('./default-opts')

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
    , context = contextify(parsed, opts)

  return svgTemplate(context);
}

},{"./contextify":"/Users/thlorenz/dev/js/flamegraph/lib/contextify.js","./default-opts":"/Users/thlorenz/dev/js/flamegraph/lib/default-opts.js","./stackparse":"/Users/thlorenz/dev/js/flamegraph/lib/stackparse.js","./svg-template":"/Users/thlorenz/dev/js/flamegraph/lib/svg-client-template.js","xtend":"/Users/thlorenz/dev/js/flamegraph/node_modules/xtend/immutable.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/inherits/inherits_browser.js":[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/util/support/isBufferBrowser.js":[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/util/util.js":[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/util/support/isBufferBrowser.js","_process":"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/process/browser.js","inherits":"/Users/thlorenz/dev/js/flamegraph/node_modules/browserify/node_modules/inherits/inherits_browser.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars.runtime.js":[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var base = require("./handlebars/base");

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)
var SafeString = require("./handlebars/safe-string")["default"];
var Exception = require("./handlebars/exception")["default"];
var Utils = require("./handlebars/utils");
var runtime = require("./handlebars/runtime");

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
var create = function() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = SafeString;
  hb.Exception = Exception;
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function(spec) {
    return runtime.template(spec, hb);
  };

  return hb;
};

var Handlebars = create();
Handlebars.create = create;

Handlebars['default'] = Handlebars;

exports["default"] = Handlebars;
},{"./handlebars/base":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/base.js","./handlebars/exception":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js","./handlebars/runtime":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/runtime.js","./handlebars/safe-string":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/safe-string.js","./handlebars/utils":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/base.js":[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "2.0.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 6;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn) {
    if (toString.call(name) === objectType) {
      if (fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function(name) {
    delete this.helpers[name];
  },

  registerPartial: function(name, partial) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function(name) {
    delete this.partials[name];
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(/* [args, ]options */) {
    if(arguments.length === 1) {
      // A missing field in a {{foo}} constuct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
        options = {data: data};
      }

      return fn(context, options);
    }
  });

  instance.registerHelper('each', function(context, options) {
    if (!options) {
      throw new Exception('Must pass iterator to #each');
    }

    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    var contextPath;
    if (options.data && options.ids) {
      contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));

            if (contextPath) {
              data.contextPath = contextPath + i;
            }
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) {
              data.key = key;
              data.index = i;
              data.first = (i === 0);

              if (contextPath) {
                data.contextPath = contextPath + key;
              }
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    var fn = options.fn;

    if (!Utils.isEmpty(context)) {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
        options = {data:data};
      }

      return fn(context, options);
    } else {
      return options.inverse(this);
    }
  });

  instance.registerHelper('log', function(message, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, message);
  });

  instance.registerHelper('lookup', function(obj, field) {
    return obj && obj[field];
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, message) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, message);
      }
    }
  }
};
exports.logger = logger;
var log = logger.log;
exports.log = log;
var createFrame = function(object) {
  var frame = Utils.extend({}, object);
  frame._parent = object;
  return frame;
};
exports.createFrame = createFrame;
},{"./exception":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js","./utils":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js":[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/runtime.js":[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;
var createFrame = require("./base").createFrame;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new Exception("No environment passed to template");
  }
  if (!templateSpec || !templateSpec.main) {
    throw new Exception('Unknown template object: ' + typeof templateSpec);
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  var invokePartialWrapper = function(partial, indent, name, context, hash, helpers, partials, data, depths) {
    if (hash) {
      context = Utils.extend({}, context, hash);
    }

    var result = env.VM.invokePartial.call(this, partial, name, context, helpers, partials, data, depths);

    if (result == null && env.compile) {
      var options = { helpers: helpers, partials: partials, data: data, depths: depths };
      partials[name] = env.compile(partial, { data: data !== undefined, compat: templateSpec.compat }, env);
      result = partials[name](context, options);
    }
    if (result != null) {
      if (indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    lookup: function(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function(i) {
      return templateSpec[i];
    },

    programs: [],
    program: function(i, data, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths) {
        programWrapper = program(this, i, fn, data, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(this, i, fn);
      }
      return programWrapper;
    },

    data: function(data, depth) {
      while (data && depth--) {
        data = data._parent;
      }
      return data;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = Utils.extend({}, common, param);
      }

      return ret;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  var ret = function(context, options) {
    options = options || {};
    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths;
    if (templateSpec.useDepths) {
      depths = options.depths ? [context].concat(options.depths) : [context];
    }

    return templateSpec.main.call(container, context, container.helpers, container.partials, data, depths);
  };
  ret.isTop = true;

  ret._setup = function(options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
    }
  };

  ret._child = function(i, data, depths) {
    if (templateSpec.useDepths && !depths) {
      throw new Exception('must pass parent depths');
    }

    return program(container, i, templateSpec[i], data, depths);
  };
  return ret;
}

exports.template = template;function program(container, i, fn, data, depths) {
  var prog = function(context, options) {
    options = options || {};

    return fn.call(container, context, container.helpers, container.partials, options.data || data, depths && [context].concat(depths));
  };
  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data, depths) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data, depths: depths };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? createFrame(data) : {};
    data.root = context;
  }
  return data;
}
},{"./base":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/base.js","./exception":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js","./utils":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/safe-string.js":[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js":[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
/* istanbul ignore next */
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (string == null) {
    return "";
  } else if (!string) {
    return string + '';
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}

exports.appendContextPath = appendContextPath;
},{"./safe-string":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars/safe-string.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/runtime.js":[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/dist/cjs/handlebars.runtime.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/hbsfy/runtime.js":[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":"/Users/thlorenz/dev/js/flamegraph/node_modules/handlebars/runtime.js"}],"/Users/thlorenz/dev/js/flamegraph/node_modules/resolve-jit-symbols/index.js":[function(require,module,exports){
'use strict';
var hexAddressRegex = /0x((\d|[abcdefABCDEF]){0,2})+/;

function byDecimalAddress(a, b) {
  return a.decimalAddress < b.decimalAddress ? -1 : 1;
}

function processLine(acc, x) {
  if (!x.trim().length) return acc;

  var parts = x.split(/ +/);
  if (parts.length < 3) return acc;

  var decimal = parseInt(parts[0], 16)

  var item = { 
      address        : parts[0]
    , size           : parts[1]
    , decimalAddress : decimal
    , symbol         : parts.slice(2).join(' ') }

  acc.push(item);
  return acc;
}

/**
 * Instantiates a JIT resolver for the given map.
 * 
 * @name JITResolver
 * @function
 * @param {String|Array.<String>} map either a string or lines with space separated HexAddress, Size, Symbol on each line
 * @return {Object} the initialized JIT resolver
 */
function JITResolver(map) {
  if (!(this instanceof JITResolver)) return new JITResolver(map);
  
  var lines = Array.isArray(map) ? map : map.split('\n')
  this._addresses = lines
    .reduce(processLine, [])
    .sort(byDecimalAddress)

  this._len = this._addresses.length;
}

module.exports = JITResolver;

var proto = JITResolver.prototype;

/**
 * Matches the address of the symbol of which the given address is part of.
 * 
 *
 * @name JITResolver::resolve
 * @function
 * @param {String|Number} hexAddress the hexadecimal address of the address to check
 * @return {Object} info of the matching symbol which includes address, size, symbol
 */
proto.resolve = function resolve(hexAddress) {
  var match = null;
  var a = typeof hexAddress === 'number' ? hexAddress : parseInt(hexAddress, 16);

  for (var i = 0; i < this._len; i++) {
    // once we hit a larger address that means our symbol/function that this
    // address is part of starts at the previous address
    if(a < this._addresses[i].decimalAddress) { 
      match = this._addresses[i - 1];
      break;
    }
  }
  return match;
}

function defaultGetHexAddress(line) {
  var m = line.match(hexAddressRegex);
  return m && m[0];
}

/**
 * Resolves all symbols in a given stack and replaces them accordingly
 * 
 * @name JITResolver::resolveMulti
 * @function
 * @param {Array.<String>|String} stack string of stack or lines of stack
 * @param {function=} getHexAddress allows overriding the function used to find a hex address on each line
 * @return {Array.<String>|String} the stack with symbols resolved in the same format that the stack was given, either as lines or one string
 */
proto.resolveMulti = function resolveMulti(stack, getHexAddress) {
  getHexAddress = getHexAddress || defaultGetHexAddress;
  var self = this;

  var isLines = Array.isArray(stack)
  var lines = isLines ? stack : stack.split('\n')

  function processLine(line) {
    var address = getHexAddress(line);
    if (!address) return line;

    var resolved = self.resolve(address);
    if (!resolved) return line;

    return line.replace(address, resolved.symbol);
  }
  
  var processedLines = lines.map(processLine);

  return isLines ? processedLines : processedLines.join('\n');
}

},{}],"/Users/thlorenz/dev/js/flamegraph/node_modules/xtend/immutable.js":[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],"/Users/thlorenz/dev/js/flamegraph/web/main.js":[function(require,module,exports){
'use strict';
/*jshint browser: true*/

var flamegraph = require('../')
  , jitResolver = require('resolve-jit-symbols')
  , resolver;

var optsTemplate = require('./opts-template.hbs');

var flamegraphEl    = document.getElementById('flamegraph');
var callgraphFileEl = document.getElementById('callgraph-file')
var mapFileEl = document.getElementById('map-file')
var optionsEl       = document.getElementById('options');

var excludeOptions = [ 'fonttype', 'fontwidth', 'countname', 'colors', 'timemax', 'factor', 'hash', 'title', 'titlestring', 'nametype', 'bgcolor1', 'bgcolor2' ];
var usedMetaKeys = Object.keys(flamegraph.defaultOptsMeta).filter(function (k) { return !~excludeOptions.indexOf(k) });

var currentFolded;

function renderOptions() {
  var opts = flamegraph.defaultOpts
    , meta = flamegraph.defaultOptsMeta;

  var context = usedMetaKeys
    .reduce(function (acc, k) {
      var type = meta[k].type;
      return acc.concat({
          name        : k
        , value       : opts[k]
        , type        : type
        , description : meta[k].description
        , min         : meta[k].min
        , max         : meta[k].max
        , step        : meta[k].step
      });
    }, []);
  var html = optsTemplate(context);
  optionsEl.innerHTML = html;

  // Need to set value in JS since it's not picked up when set in html that is added to DOM afterwards
  usedMetaKeys 
    .forEach(function (k) {
      var val = opts[k];
      var el = document.getElementById(k);
      el.value = val;
    });
}

function getOptions() {
  var meta = flamegraph.defaultOptsMeta;

  usedMetaKeys 
    .reduce(function (acc, k) {
      var el = document.getElementById(k);
      var val = el.value;
      if (meta[k].type === 'number') {
        val = val.length ? parseFloat(val) : Infinity;
      } else if (meta[k].type === 'boolean') {
        val = val.length ? Boolean(val) : false; 
      }
      acc[k] = val;
      return acc;
    }, flamegraph.defaultOpts);
}

function onOptionsChange(e) {
  refresh();
}

function registerChange() {
  var inputs = optionsEl.getElementsByTagName('input')
    , i, el;
  
  for (i = 0; i < inputs.length; i++) {
    el = inputs[i];
    el.onchange = onOptionsChange;
  }
}

function hookHoverMethods() {
  var details = document.getElementById("details").firstChild;
  window.s = function s(info) { 
    details.nodeValue = "Function: " + info; 
  }
  window.c = function c() { 
    details.nodeValue = ' '; 
  }
}

function render(arr) {
  var opts = getOptions();

  var svg;
  try {
    currentFolded = arr;
    svg = flamegraph(arr, opts);
    flamegraphEl.innerHTML= svg;
    hookHoverMethods();
  } catch (err) {
    flamegraphEl.innerHTML = '<br><p class="error">' + err.toString() + '</p>';
  }
}

function refresh() {
  if (!currentFolded) return;
  render(currentFolded);
}

function readFile(file, cb) {
  var fileReader = new FileReader();
  fileReader.readAsText(file, 'utf-8');
  fileReader.onload = function onload(err) {
    cb(err, fileReader.result);
  }
}

function onFile(e, process) {
  var file = e.target.files[0];
  if (!file) return;
  readFile(file, process);
}

function processCallgraphFile(e) {
  var arr = e.target.result.split('\n');
  if (resolver) arr = resolver.resolveMulti(arr);
  render(arr);
}

function processMapFile(e) {
  var map = e.target.result;
  resolver = jitResolver(map);
  if (currentFolded) currentFolded = resolver.resolveMulti(currentFolded);
  refresh();
}

function onCallgraphFile(e) {
  onFile(e, processCallgraphFile);
}

function onMapFile(e) {
  onFile(e, processMapFile);
}

// Event Listeners
callgraphFileEl.addEventListener('change', onCallgraphFile);
mapFileEl.addEventListener('change', onMapFile);

// Setup 
renderOptions();
registerChange();

},{"../":"/Users/thlorenz/dev/js/flamegraph/index.js","./opts-template.hbs":"/Users/thlorenz/dev/js/flamegraph/web/opts-template.hbs","resolve-jit-symbols":"/Users/thlorenz/dev/js/flamegraph/node_modules/resolve-jit-symbols/index.js"}],"/Users/thlorenz/dev/js/flamegraph/web/opts-template.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"options-input\">\n  <p>"
    + escapeExpression(((helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"description","hash":{},"data":data}) : helper)))
    + "</p>\n  <input type=\""
    + escapeExpression(((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"type","hash":{},"data":data}) : helper)))
    + "\" name=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" id=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" value\""
    + escapeExpression(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"value","hash":{},"data":data}) : helper)))
    + "\" min=\""
    + escapeExpression(((helper = (helper = helpers.min || (depth0 != null ? depth0.min : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"min","hash":{},"data":data}) : helper)))
    + "\" max=\""
    + escapeExpression(((helper = (helper = helpers.max || (depth0 != null ? depth0.max : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"max","hash":{},"data":data}) : helper)))
    + "\" step=\""
    + escapeExpression(((helper = (helper = helpers.step || (depth0 != null ? depth0.step : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"step","hash":{},"data":data}) : helper)))
    + "\">\n</div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers.each.call(depth0, depth0, {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"useData":true});

},{"hbsfy/runtime":"/Users/thlorenz/dev/js/flamegraph/node_modules/hbsfy/runtime.js"}]},{},["/Users/thlorenz/dev/js/flamegraph/web/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb2xsYXBzZS1pbnN0cnVtZW50cy5qcyIsImxpYi9jb2xsYXBzZS1wZXJmLmpzIiwibGliL2NvbG9yLW1hcC5qcyIsImxpYi9jb250ZXh0aWZ5LmpzIiwibGliL2RlZmF1bHQtb3B0cy1tZXRhLmpzIiwibGliL2RlZmF1bHQtb3B0cy5qcyIsImxpYi9kZXRlY3QtaW5wdXR0eXBlLmpzIiwibGliL3N0YWNrY29sbGFwc2UuanMiLCJsaWIvc3RhY2twYXJzZS5qcyIsImxpYi9zdmctY2xpZW50LXRlbXBsYXRlLmpzIiwibGliL3N2Zy5oYnMiLCJsaWIvc3ZnLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24uanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGJzZnkvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXNvbHZlLWppdC1zeW1ib2xzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL2ltbXV0YWJsZS5qcyIsIndlYi9tYWluLmpzIiwid2ViL29wdHMtdGVtcGxhdGUuaGJzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRldGVjdElucHV0VHlwZSA9IHJlcXVpcmUoJy4vbGliL2RldGVjdC1pbnB1dHR5cGUnKVxuICAsIHN0YWNrQ29sbGFwc2UgICA9IHJlcXVpcmUoJy4vbGliL3N0YWNrY29sbGFwc2UnKVxuICAsIHN2ZyAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL3N2ZycpXG4gICwgZGVmYXVsdE9wdHMgICAgID0gcmVxdWlyZSgnLi9saWIvZGVmYXVsdC1vcHRzJylcbiAgLCBkZWZhdWx0T3B0c01ldGEgPSByZXF1aXJlKCcuL2xpYi9kZWZhdWx0LW9wdHMtbWV0YScpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPVxuXG4vKipcbiAqIENvbnZlcnRzIGFuIGFycmF5IG9mIGNhbGwgZ3JhcGggbGluZXMgaW50byBhbiBzdmcgZG9jdW1lbnQuXG4gKiBJZiBgb3B0cy5pbnB1dHR5cGVgIGlzIG5vdCBnaXZlbiBpdCB3aWxsIGJlIGRldGVjdGVkIGZyb20gdGhlIGlucHV0LlxuICpcbiAqIEBuYW1lIGZsYW1lZ3JhcGhcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtBcnJheS48c3RyaW5nPn0gYXJyICAgICAgaW5wdXQgbGluZXMgdG8gcmVuZGVyIHN2ZyBmb3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIG9iamVjdHMgdGhhdCBhZmZlY3QgdGhlIHZpc3VhbGl6YXRpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmlucHV0dHlwZSAgIHRoZSB0eXBlIG9mIGNhbGxncmFwaCBgaW5zdHJ1bWVudHMgfCBwZXJmYFxuICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuZm9udHR5cGUgICAgdHlwZSBvZiBmb250IHRvIHVzZSAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAnVmVyZGFuYSdgXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0cy5mb250c2l6ZSAgICBiYXNlIHRleHQgc2l6ZSAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogYDEyYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuaW1hZ2V3aWR0aCAgbWF4IHdpZHRoLCBwaXhlbHMgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAxMjAwYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuZnJhbWVoZWlnaHQgbWF4IGhlaWdodCBpcyBkeW5hbWljICAgICAgICAgICAgIGRlZmF1bHQ6IGAxNi4wYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuZm9udHdpZHRoICAgYXZnIHdpZHRoIHJlbGF0aXZlIHRvIGZvbnRzaXplICAgIGRlZmF1bHQ6IGAwLjU5YFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMubWlud2lkdGggICAgbWluIGZ1bmN0aW9uIHdpZHRoLCBwaXhlbHMgICAgICAgIGRlZmF1bHQ6IGAwLjFgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5jb3VudG5hbWUgICB3aGF0IGFyZSB0aGUgY291bnRzIGluIHRoZSBkYXRhPyAgZGVmYXVsdDogYCdzYW1wbGVzJ2BcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmNvbG9ycyAgICAgIGNvbG9yIHRoZW1lICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBgJ2hvdCdgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5iZ2NvbG9yMSAgICBiYWNrZ3JvdW5kIGNvbG9yIGdyYWRpZW50IHN0YXJ0ICAgZGVmYXVsdDogYCcjZWVlZWVlJ2BcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmJnY29sb3IyICAgIGJhY2tncm91bmQgY29sb3IgZ3JhZGllbnQgc3RvcCAgICBkZWZhdWx0OiBgJyNlZWVlYjAnYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMudGltZW1heCAgICAgKG92ZXJyaWRlIHRoZSkgc3VtIG9mIHRoZSBjb3VudHMgIGRlZmF1bHQ6IGBJbmZpbml0eWBcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLmZhY3RvciAgICAgIGZhY3RvciB0byBzY2FsZSBjb3VudHMgYnkgICAgICAgICBkZWZhdWx0OiBgMWBcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5oYXNoICAgICAgIGNvbG9yIGJ5IGZ1bmN0aW9uIG5hbWUgICAgICAgICAgICBkZWZhdWx0OiBgdHJ1ZWBcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLnRpdGxldGV4dCAgIGNlbnRlcmVkIGhlYWRpbmcgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBgJ0ZsYW1lIEdyYXBoJ2BcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLm5hbWV0eXBlICAgIHdoYXQgYXJlIHRoZSBuYW1lcyBpbiB0aGUgZGF0YT8gICBkZWZhdWx0OiBgJ0Z1bmN0aW9uOidgXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHN2ZyAgICAgICAgICAgICB0aGUgcmVuZGVyZWQgc3ZnXG4gKi9cbmZ1bmN0aW9uIGZsYW1lZ3JhcGgoYXJyLCBvcHRzKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmcgbmVlZHMgdG8gYmUgYW4gYXJyYXkgb2YgbGluZXMuJyk7XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciBjb2xsYXBzZWQgPSBzdGFja0NvbGxhcHNlRnJvbUFycmF5KGFyciwgb3B0cy5pbnB1dHR5cGUpO1xuICByZXR1cm4gc3ZnKGNvbGxhcHNlZCwgb3B0cyk7XG59XG5cbnZhciBzdGFja0NvbGxhcHNlRnJvbUFycmF5ID0gZXhwb3J0cy5zdGFja0NvbGxhcHNlRnJvbUFycmF5ID0gXG5cbi8qKlxuICogQ29sbGFwc2VzIGEgY2FsbGdyYXBoIGluc2lkZSBhIGdpdmVuIGxpbmVzIGFycmF5IGxpbmUgYnkgbGluZS5cbiAqIFxuICogQG5hbWUgZmxhbWVncmFwaDo6c3RhY2tDb2xsYXBzZUZyb21BcnJheVxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSB0aGUgdHlwZSBvZiBpbnB1dCB0byBjb2xsYXBzZSAoaWYgbm90IHN1cHBsaWVkIGl0IGlzIGRldGVjdGVkIGZyb20gdGhlIGlucHV0KVxuICogQHBhcmFtIHtBcnJheS48c3RyaW5nPn0gYXJyIGxpbmVzIHRvIGNvbGxhcHNlXG4gKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gYXJyYXkgb2YgY29sbGFwc2VkIGxpbmVzXG4gKi9cbmZ1bmN0aW9uIHN0YWNrQ29sbHBhc2VGcm9tQXJyYXkgKGFyciwgaW5wdXRUeXBlKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmcgbmVlZHMgdG8gYmUgYW4gYXJyYXkgb2YgbGluZXMuJyk7XG5cbiAgaW5wdXRUeXBlID0gaW5wdXRUeXBlIHx8IGRldGVjdElucHV0VHlwZShhcnIpO1xuICBpZiAoIWlucHV0VHlwZSkgdGhyb3cgbmV3IEVycm9yKCdObyBpbnB1dCB0eXBlIGdpdmVuIGFuZCB1bmFibGUgdG8gZGV0ZWN0IGl0IGZvciB0aGUgZ2l2ZW4gaW5wdXQhJyk7XG5cbiAgcmV0dXJuIHN0YWNrQ29sbGFwc2UoaW5wdXRUeXBlLCBhcnIpO1xufVxuXG5leHBvcnRzLnN0YWNrQ29sbGFwc2UgICA9IHN0YWNrQ29sbGFwc2U7XG5leHBvcnRzLnN2ZyAgICAgICAgICAgICA9IHN2ZztcbmV4cG9ydHMuZGVmYXVsdE9wdHMgICAgID0gZGVmYXVsdE9wdHM7XG5leHBvcnRzLmRlZmF1bHRPcHRzTWV0YSA9IGRlZmF1bHRPcHRzTWV0YTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlZ2V4cCA9IC8oXFxkKylcXC5cXGQrbXNbXixdKyxcXGQrLFxccyssKFxccyopKC4rKS87XG5cbmZ1bmN0aW9uIGFkZEZyYW1lKGYpIHtcbiAgcmV0dXJuIGYgKyAnOyc7XG59XG5cbmZ1bmN0aW9uIEluc3RydW1lbnRzQ29sbGFwc2VyKCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgSW5zdHJ1bWVudHNDb2xsYXBzZXIpKSByZXR1cm4gbmV3IEluc3RydW1lbnRzQ29sbGFwc2VyKCk7XG5cbiAgdGhpcy5zdGFjayA9IFtdO1xuICB0aGlzLmNvbGxhcHNlZCA9IFtdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RydW1lbnRzQ29sbGFwc2VyO1xudmFyIHByb3RvID0gSW5zdHJ1bWVudHNDb2xsYXBzZXIucHJvdG90eXBlO1xuXG5wcm90by5jb2xsYXBzZUxpbmUgPSBmdW5jdGlvbiBjb2xsYXBzZUxpbmUobGluZSkge1xuICB2YXIgbWF0Y2hlcyA9IGxpbmUubWF0Y2gocmVnZXhwKTtcbiAgaWYgKCFtYXRjaGVzIHx8ICFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBtcyAgICA9IG1hdGNoZXNbMV07XG4gIHZhciBkZXB0aCA9IG1hdGNoZXNbMl0ubGVuZ3RoO1xuICB2YXIgZm4gICAgPSBtYXRjaGVzWzNdO1xuICB0aGlzLnN0YWNrW2RlcHRoXSA9IGZuO1xuXG4gIHZhciByZXMgPSAnJztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBkZXB0aDsgaSsrKSByZXMgKz0gYWRkRnJhbWUodGhpcy5zdGFja1tpXSlcbiAgICBcbiAgcmVzICs9IGZuICsgJyAnICsgbXMgKyAnXFxuJztcblxuICB0aGlzLmNvbGxhcHNlZC5wdXNoKHJlcy50cmltKCdcXG4nKSk7XG59XG5cbnByb3RvLmNvbGxhcHNlZExpbmVzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jb2xsYXBzZWQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBmb3JtYXQgPSByZXF1aXJlKCd1dGlsJykuZm9ybWF0O1xudmFyIGluY2x1ZGVQbmFtZSA9IHRydWU7XG5cblxuZnVuY3Rpb24gaW5zcGVjdChvYmosIGRlcHRoKSB7XG4gIGNvbnNvbGUuZXJyb3IocmVxdWlyZSgndXRpbCcpLmluc3BlY3Qob2JqLCBmYWxzZSwgZGVwdGggfHwgNSwgdHJ1ZSkpO1xufVxuXG5mdW5jdGlvbiBQZXJmQ29sbGFwc2VyKG9wdHMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBlcmZDb2xsYXBzZXIpKSByZXR1cm4gbmV3IFBlcmZDb2xsYXBzZXIob3B0cyk7XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHRoaXMuaW5jbHVkZVBuYW1lID0gdHlwZW9mIG9wdHMuaW5jbHVkZVBuYW1lID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiBvcHRzLmluY2x1ZGVQbmFtZVxuICB0aGlzLnN0YWNrID0gdW5kZWZpbmVkO1xuICB0aGlzLnBuYW1lID0gdW5kZWZpbmVkO1xuICB0aGlzLmNvbGxhcHNlZCA9IHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBlcmZDb2xsYXBzZXI7XG5cbnZhciBwcm90byA9IFBlcmZDb2xsYXBzZXIucHJvdG90eXBlO1xuXG5wcm90by5yZW1lbWJlclN0YWNrID0gZnVuY3Rpb24gcmVtZW1iZXJTdGFjayhqb2luZWRTdGFjaywgY291bnQpIHtcbiAgaWYgKCF0aGlzLmNvbGxhcHNlZFtqb2luZWRTdGFja10pIHRoaXMuY29sbGFwc2VkW2pvaW5lZFN0YWNrXSA9IDA7XG4gIHRoaXMuY29sbGFwc2VkW2pvaW5lZFN0YWNrXSArPSBjb3VudDtcbn1cblxucHJvdG8udW5zaGlmdFN0YWNrID0gZnVuY3Rpb24gdW5zaGlmdFN0YWNrKHZhbCkge1xuICBpZiAoIXRoaXMuc3RhY2spIHRoaXMuc3RhY2sgPSBbIHZhbCBdO1xuICBlbHNlIHRoaXMuc3RhY2sudW5zaGlmdCh2YWwpO1xufVxuXG5wcm90by5jb2xsYXBzZUxpbmUgPSBmdW5jdGlvbiBwZXJmQ29sbGFwc2VMaW5lKGxpbmUpIHtcbiAgdmFyIGZ1bmMsIG1vZDtcblxuICAvLyBpZ25vcmUgY29tbWVudHNcbiAgaWYgKC9eIy8udGVzdChsaW5lKSkgcmV0dXJuO1xuXG4gIC8vIGVtcHR5IGxpbmVzXG4gIGlmICghbGluZS5sZW5ndGgpIHtcbiAgICBpZiAodGhpcy5wbmFtZSkgdGhpcy51bnNoaWZ0U3RhY2sodGhpcy5wbmFtZSk7XG4gICAgaWYgKHRoaXMuc3RhY2spIHRoaXMucmVtZW1iZXJTdGFjayh0aGlzLnN0YWNrLmpvaW4oJzsnKSwgMSk7XG4gICAgdGhpcy5zdGFjayA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnBuYW1lID0gdW5kZWZpbmVkO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGxpbmVzIGNvbnRhaW5pbmcgcHJvY2VzcyBuYW1lXG4gIHZhciBtYXRjaGVzID0gbGluZS5tYXRjaCgvXihcXFMrKVxccy8pO1xuICBpZiAobWF0Y2hlcyAmJiBtYXRjaGVzLmxlbmd0aCkge1xuICAgIGlmICh0aGlzLmluY2x1ZGVQbmFtZSkgdGhpcy5wbmFtZSA9IG1hdGNoZXNbMV07XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbWF0Y2hlcyA9IGxpbmUubWF0Y2goL15cXHMqXFx3K1xccyooLispIChcXFMrKS8pO1xuICBpZiAobWF0Y2hlcyAmJiBtYXRjaGVzLmxlbmd0aCkge1xuICAgIGZ1bmMgPSBtYXRjaGVzWzFdO1xuICAgIFxuICAgIC8vIHNraXAgcHJvY2VzcyBuYW1lc1xuICAgIGlmICgoL15cXCgvKS50ZXN0KGZ1bmMpKSByZXR1cm47IFxuXG4gICAgdGhpcy51bnNoaWZ0U3RhY2soZnVuYyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc29sZS53YXJuKCdVbnJlY29nbml6ZWQgbGluZTogXCIlc1wiJywgbGluZSk7XG59XG5cbnByb3RvLmNvbGxhcHNlZExpbmVzID0gZnVuY3Rpb24gY29sbGFwc2VkTGluZXMoKSB7XG4gIHZhciBjb2xsYXBzZWQgPSB0aGlzLmNvbGxhcHNlZDtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbGxhcHNlZClcbiAgICAuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYSA8IGIgPyAtMSA6IDEgfSlcbiAgICAubWFwKGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gZm9ybWF0KCclcyAlcycsIGssIGNvbGxhcHNlZFtrXSk7XG4gICAgfSlcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZvcm1hdCA9IHJlcXVpcmUoJ3V0aWwnKS5mb3JtYXQ7XG5cbmZ1bmN0aW9uIHNjYWxhclJldmVyc2Uocykge1xuICByZXR1cm4gcy5zcGxpdCgnJykucmV2ZXJzZSgpLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBuYW1lSGFzaChuYW1lKSB7XG5cdC8vIEdlbmVyYXRlIGEgdmVjdG9yIGhhc2ggZm9yIHRoZSBuYW1lIHN0cmluZywgd2VpZ2h0aW5nIGVhcmx5IG92ZXJcblx0Ly8gbGF0ZXIgY2hhcmFjdGVycy4gV2Ugd2FudCB0byBwaWNrIHRoZSBzYW1lIGNvbG9ycyBmb3IgZnVuY3Rpb25cblx0Ly8gbmFtZXMgYWNyb3NzIGRpZmZlcmVudCBmbGFtZSBncmFwaHMuXG5cdHZhciB2ZWN0b3IgPSAwXG5cdCAgLCB3ZWlnaHQgPSAxXG5cdCAgLCBtYXggPSAxXG5cdCAgLCBtb2QgPSAxMFxuXHQgICwgb3JkXG5cblx0Ly8gaWYgbW9kdWxlIG5hbWUgcHJlc2VudCwgdHJ1bmMgdG8gMXN0IGNoYXJcbiAgbmFtZSA9IG5hbWUucmVwbGFjZSgvLiguKj8pYC8sICcnKTtcbiAgdmFyIHNwbGl0cyA9IG5hbWUuc3BsaXQoJycpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNwbGl0cy5sZW5ndGg7IGkrKykge1xuICAgIG9yZCA9IHNwbGl0c1tpXS5jaGFyQ29kZUF0KDApICUgbW9kO1xuICAgIHZlY3RvciArPSAob3JkIC8gKG1vZCsrIC0gMSkpICogd2VpZ2h0O1xuICAgIG1heCArPSB3ZWlnaHQ7XG4gICAgd2VpZ2h0ICo9IDAuNzA7XG4gICAgaWYgKG1vZCA+IDEyKSBicmVhaztcbiAgfVxuXHQgXG4gIHJldHVybiAoMSAtIHZlY3RvciAvIG1heCk7XG59XG5cbmZ1bmN0aW9uIGNvbG9yKHR5cGUsIGhhc2gsIG5hbWUpIHtcbiAgdmFyIHYxLCB2MiwgdjMsIHIsIGcsIGI7XG4gIGlmICghdHlwZSkgcmV0dXJuICdyZ2IoMCwgMCwgMCknO1xuXG4gIGlmIChoYXNoKSB7XG4gICAgdjEgPSBuYW1lSGFzaChuYW1lKTtcbiAgICB2MiA9IHYzID0gbmFtZUhhc2goc2NhbGFyUmV2ZXJzZShuYW1lKSk7XG4gIH0gZWxzZSB7XG5cdFx0djEgPSBNYXRoLnJhbmRvbSgpICsgMTtcblx0XHR2MiA9IE1hdGgucmFuZG9tKCkgKyAxO1xuXHRcdHYzID0gTWF0aC5yYW5kb20oKSArIDE7XG4gIH1cblxuICBzd2l0Y2godHlwZSkge1xuICAgIGNhc2UgJ2hvdCc6XG4gICAgICByID0gMjA1ICsgTWF0aC5yb3VuZCg1MCAqIHYzKTtcbiAgICAgIGcgPSAwICsgTWF0aC5yb3VuZCgyMzAgKiB2MSk7XG4gICAgICBiID0gMCArIE1hdGgucm91bmQoNTUgKiB2Mik7XG4gICAgICByZXR1cm4gZm9ybWF0KCdyZ2IoJXMsICVzLCAlcyknLHIsIGcsIGIpO1xuICAgIGNhc2UgJ21lbSc6XG4gICAgICByID0gMDtcbiAgICAgIGcgPSAxOTAgKyBNYXRoLnJvdW5kKDUwICogdjIpO1xuICAgICAgYiA9IDAgKyBNYXRoLnJvdW5kKDIxMCAqIHYxKTtcbiAgICAgIHJldHVybiBmb3JtYXQoJ3JnYiglcywgJXMsICVzKScsciwgZywgYik7XG4gICAgY2FzZSAnaW8nOlxuICAgICAgciA9IDgwICsgTWF0aC5yb3VuZCg2MCAqIHYxKTtcbiAgICAgIGcgPSByO1xuICAgICAgYiA9IDE5MCArIE1hdGgucm91bmQoNTUgKiB2Mik7XG4gICAgICByZXR1cm4gZm9ybWF0KCdyZ2IoJXMsICVzLCAlcyknLHIsIGcsIGIpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gdHlwZSAnICsgdHlwZSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBcblxuLyoqXG4gKiBNYXBzIGEgZnVuY3Rpb24gbmFtZSB0byBhIGNvbG9yLCB3aGlsZSB0cnlpbmcgdG8gY3JlYXRlIHNhbWUgY29sb3JzIGZvciBzaW1pbGFyIGZ1bmN0aW9ucy5cbiAqIFxuICogQG5hbWUgY29sb3JNYXBcbiAqIEBmdW5jdGlvblxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsIHN0cmluZz59IHBhbGV0dGVNYXAgY3VycmVudCBtYXAgb2YgY29sb3JzIGBmdW5jOiBjb2xvcmBcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvclRoZW1lIHRoZW1lIG9mIGNvbG9ycyB0byBiZSB1c2VkIGBob3QgfCBtZW0gfCBpb2BcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gaGFzaCBpZiB0cnVlIGNvbG9ycyB3aWxsIGJlIGNyZWF0ZWQgZnJvbSBuYW1lIGhhc2gsIG90aGVyd2lzZSB0aGV5IGFyZSByYW5kb21cbiAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jIHRoZSBmdW5jdGlvbiBuYW1lIGZvciB3aGljaCB0byBzZWxlY3QgYSBjb2xvclxuICogQHJldHVybiB7c3RyaW5nfSBjb250YWluaW5nIGFuIHJnYiBjb2xvciwgaS5lLiBgJ3JnYigxLCAyLCAzKSdgXG4gKi9cbmZ1bmN0aW9uIGNvbG9yTWFwKHBhbGV0dGVNYXAsIGNvbG9yVGhlbWUsIGhhc2gsIGZ1bmMpIHtcbiAgaWYgKHBhbGV0dGVNYXBbZnVuY10pIHJldHVybiBwYWxldHRlTWFwW2Z1bmNdO1xuICBwYWxldHRlTWFwW2Z1bmNdID0gY29sb3IoY29sb3JUaGVtZSwgaGFzaCwgZnVuYyk7XG4gIHJldHVybiBwYWxldHRlTWFwW2Z1bmNdO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgeHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpXG4gICwgZm9ybWF0ID0gcmVxdWlyZSgndXRpbCcpLmZvcm1hdFxuICAsIGNvbG9yTWFwID0gcmVxdWlyZSgnLi9jb2xvci1tYXAnKVxuXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgZGVwdGgpIHtcbiAgY29uc29sZS5lcnJvcihyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChvYmosIGZhbHNlLCBkZXB0aCB8fCA1LCB0cnVlKSk7XG59XG5cbmZ1bmN0aW9uIG9uZURlY2ltYWwoeCkge1xuICByZXR1cm4gKE1hdGgucm91bmQoeCAqIDEwKSAvIDEwKTtcbn1cblxuZnVuY3Rpb24gaHRtbEVzY2FwZShzKSB7XG4gIHJldHVybiBzXG4gICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFxuICBcbi8qKlxuICogRXh0cmFjdHMgYSBjb250ZXh0IG9iamVjdCBmcm9tIHRoZSBwYXJzZWQgY2FsbGdyYXBoIEBzZWUgYHN0YWNrcGFyc2UuanNgLlxuICogVGhpcyBjb250ZXh0IGNhbiB0aGVuIGJlIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHN2ZyBmaWxlIHZpYSBhIHRlbXBsYXRlLlxuICogXG4gKiBAbmFtZSBjb250ZXh0aWZ5XG4gKiBAcHJpdmF0ZVxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyc2VkIG5vZGVzXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBvcHRpb25zIHRoYXQgYWZmZWN0IHZpc3VhbCBhbmQgaG93IHRoZSBub2RlcyBhcmUgZmlsdGVyZWRcbiAqL1xuZnVuY3Rpb24gY29udGV4dGlmeShwYXJzZWQsIG9wdHMpIHtcbiAgdmFyIHRpbWUgICAgICAgPSBwYXJzZWQudGltZVxuICAgICwgdGltZU1heCAgICA9IG9wdHMudGltZW1heFxuICAgICwgeXBhZFRvcCAgICA9IG9wdHMuZm9udHNpemUgKiA0ICAgICAgICAgICAvLyBwYWQgdG9wLCBpbmNsdWRlIHRpdGxlXG4gICAgLCB5cGFkQm90dG9tID0gb3B0cy5mb250c2l6ZSAqIDIgKyAxMCAgICAgIC8vIHBhZCBib3R0b20sIGluY2x1ZGUgbGFiZWxzXG4gICAgLCB4cGFkICAgICAgID0gMTAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhZCBsZWZ0IGFuZCByaWdodFxuICAgICwgZGVwdGhNYXggICA9IDBcbiAgICAsIGZyYW1lSGVpZ2h0ID0gb3B0cy5mcmFtZWhlaWdodFxuICAgICwgcGFsZXR0ZU1hcCA9IHt9XG5cbiAgaWYgKHRpbWVNYXggPCB0aW1lICYmIHRpbWVNYXgvdGltZSA+IDAuMDIpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTcGVjaWZpZWQgdGltZW1heCAlZCBpcyBsZXNzIHRoYW4gYWN0dWFsIHRvdGFsICVkLCBzbyBpdCB3aWxsIGJlIGlnbm9yZWQnLCB0aW1lTWF4LCB0aW1lKTtcbiAgICB0aW1lTWF4ID0gSW5maW5pdHk7XG4gIH1cblxuICB0aW1lTWF4ID0gTWF0aC5taW4odGltZSwgdGltZU1heCk7XG5cbiAgdmFyIHdpZHRoUGVyVGltZSA9IChvcHRzLmltYWdld2lkdGggLSAyICogeHBhZCkgLyB0aW1lTWF4XG4gICAgLCBtaW5XaWR0aFRpbWUgPSBvcHRzLm1pbndpZHRoIC8gd2lkdGhQZXJUaW1lXG5cbiAgZnVuY3Rpb24gcHJ1bmVOYXJyb3dCbG9ja3MoKSB7XG5cbiAgICBmdW5jdGlvbiBub25OYXJyb3dCbG9jayhhY2MsIGspIHtcbiAgICAgIHZhciB2YWwgPSBwYXJzZWQubm9kZXNba107XG4gICAgICBpZiAodHlwZW9mIHZhbC5zdGltZSAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBzdGFydCBmb3IgJyArIGspO1xuICAgICAgaWYgKCh2YWwuZXRpbWUgLSB2YWwuc3RpbWUpIDwgbWluV2lkdGhUaW1lKSByZXR1cm4gYWNjO1xuXG4gICAgICBhY2Nba10gPSBwYXJzZWQubm9kZXNba107XG4gICAgICBkZXB0aE1heCA9IE1hdGgubWF4KHZhbC5kZXB0aCwgZGVwdGhNYXgpO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyc2VkLm5vZGVzKS5yZWR1Y2Uobm9uTmFycm93QmxvY2ssIHt9KTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gcHJvY2Vzc05vZGUobm9kZSkge1xuICAgIHZhciBmdW5jICA9IG5vZGUuZnVuY1xuICAgICAgLCBkZXB0aCA9IG5vZGUuZGVwdGhcbiAgICAgICwgZXRpbWUgPSBub2RlLmV0aW1lXG4gICAgICAsIHN0aW1lID0gbm9kZS5zdGltZVxuICAgICAgLCBmYWN0b3IgPSBvcHRzLmZhY3RvclxuICAgICAgLCBjb3VudE5hbWUgPSBvcHRzLmNvdW50bmFtZVxuICAgICAgLCBpc1Jvb3QgPSAhZnVuYy5sZW5ndGggJiYgZGVwdGggPT09IDBcbiAgICA7XG5cbiAgICBpZiAoaXNSb290KSBldGltZSA9IHRpbWVNYXg7XG4gICAgXG4gICAgdmFyIHNhbXBsZXMgPSBNYXRoLnJvdW5kKChldGltZSAtIHN0aW1lICogZmFjdG9yKSAqIDEwKSAvIDEwXG4gICAgICAsIHNhbXBsZXNUeHQgPSBzYW1wbGVzLnRvTG9jYWxlU3RyaW5nKClcbiAgICAgICwgcGN0XG4gICAgICAsIHBjdFR4dFxuICAgICAgLCBlc2NhcGVkRnVuY1xuICAgICAgLCBuYW1lXG4gICAgICAsIHNhbXBsZUluZm9cblxuICAgIGlmIChpc1Jvb3QpIHtcbiAgICAgIG5hbWUgPSAnYWxsJztcbiAgICAgIHNhbXBsZUluZm8gPSBmb3JtYXQoJyglcyAlcywgMTAwJSknLCBzYW1wbGVzVHh0LCBjb3VudE5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwY3QgPSBNYXRoLnJvdW5kKCgxMDAgKiBzYW1wbGVzKSAvICh0aW1lTWF4ICogZmFjdG9yKSAqIDEwKSAvIDEwXG4gICAgICBwY3RUeHQgPSBwY3QudG9Mb2NhbGVTdHJpbmcoKVxuICAgICAgZXNjYXBlZEZ1bmMgPSBodG1sRXNjYXBlKGZ1bmMpO1xuXG4gICAgICBuYW1lID0gZXNjYXBlZEZ1bmM7XG4gICAgICBzYW1wbGVJbmZvID0gZm9ybWF0KCcoJXMgJXMpLCAlcyUlKScsIHNhbXBsZXNUeHQsIGNvdW50TmFtZSwgcGN0VHh0KTtcbiAgICB9XG5cbiAgICB2YXIgeDEgPSBvbmVEZWNpbWFsKHhwYWQgKyBzdGltZSAqIHdpZHRoUGVyVGltZSlcbiAgICAgICwgeDIgPSBvbmVEZWNpbWFsKHhwYWQgKyBldGltZSAqIHdpZHRoUGVyVGltZSlcbiAgICAgICwgeTEgPSBvbmVEZWNpbWFsKGltYWdlSGVpZ2h0IC0geXBhZEJvdHRvbSAtIChkZXB0aCArIDEpICogZnJhbWVIZWlnaHQgKyAxKVxuICAgICAgLCB5MiA9IG9uZURlY2ltYWwoaW1hZ2VIZWlnaHQgLSB5cGFkQm90dG9tIC0gZGVwdGggKiBmcmFtZUhlaWdodClcbiAgICAgICwgY2hhcnMgPSAoeDIgLSB4MSkgLyAob3B0cy5mb250c2l6ZSAqIG9wdHMuZm9udHdpZHRoKVxuICAgICAgLCBzaG93VGV4dCA9IGZhbHNlXG4gICAgICAsIHRleHRcbiAgICAgICwgdGV4dF94XG4gICAgICAsIHRleHRfeVxuXG4gICAgaWYgKGNoYXJzID49IDMgKSB7IC8vIGVub3VnaCByb29tIHRvIGRpc3BsYXkgZnVuY3Rpb24gbmFtZT9cbiAgICAgIHNob3dUZXh0ID0gdHJ1ZTtcbiAgICAgIHRleHQgPSBmdW5jLnNsaWNlKDAsIGNoYXJzKTtcbiAgICAgIGlmIChjaGFycyA8IGZ1bmMubGVuZ3RoKSB0ZXh0ID0gdGV4dC5zbGljZSgwLCBjaGFycyAtIDIpICsgJy4uJztcbiAgICAgIHRleHQgPSBodG1sRXNjYXBlKHRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUgICAgICA6IG5hbWVcbiAgICAgICwgc2FtcGxlcyAgIDogc2FtcGxlSW5mb1xuICAgICAgLCByZWN0X3ggICAgOiB4MVxuICAgICAgLCByZWN0X3kgICAgOiB5MVxuICAgICAgLCByZWN0X3cgICAgOiB4MiAtIHgxXG4gICAgICAsIHJlY3RfaCAgICA6IHkyIC0geTFcbiAgICAgICwgcmVjdF9maWxsIDogY29sb3JNYXAocGFsZXR0ZU1hcCwgb3B0cy5jb2xvcnMsIG9wdHMuaGFzaCwgZnVuYylcbiAgICAgICwgc2hvd1RleHQgIDogc2hvd1RleHRcbiAgICAgICwgdGV4dCAgICAgIDogdGV4dFxuICAgICAgLCB0ZXh0X3ggICAgOiB4MSArIDNcbiAgICAgICwgdGV4dF95ICAgIDogMyArICh5MSArIHkyKSAvIDJcbiAgICB9XG4gIH1cblxuICB2YXIgbm9kZXMgPSBwcnVuZU5hcnJvd0Jsb2NrcygpO1xuXG4gIHZhciBpbWFnZUhlaWdodCA9IChkZXB0aE1heCAqIGZyYW1lSGVpZ2h0KSArIHlwYWRUb3AgKyB5cGFkQm90dG9tO1xuICB2YXIgY3R4ID0geHRlbmQob3B0cywge1xuICAgICAgaW1hZ2VoZWlnaHQgOiBpbWFnZUhlaWdodFxuICAgICwgeHBhZCAgICAgICAgOiB4cGFkXG4gICAgLCB0aXRsZVggICAgICA6IG9wdHMuaW1hZ2V3aWR0aCAvIDJcbiAgICAsIGRldGFpbHNZICAgIDogaW1hZ2VIZWlnaHQgLSAoZnJhbWVIZWlnaHQgLyAyKSBcbiAgfSk7XG5cbiAgY3R4Lm5vZGVzID0gT2JqZWN0LmtleXMobm9kZXMpXG4gICAgLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrKSB7XG4gICAgICBhY2MucHVzaChwcm9jZXNzTm9kZShub2Rlc1trXSkpO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCBbXSk7XG4gIHJldHVybiBjdHg7XG59IFxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBmb250dHlwZSAgICA6IHsgdHlwZSA6ICdzdHJpbmcnICAsIGRlc2NyaXB0aW9uIDogJ0ZvbnQgVHlwZScgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgZm9udHNpemUgICAgOiB7IHR5cGUgOiAncmFuZ2UnICAgLCBkZXNjcmlwdGlvbiA6ICdGb250IFNpemUnICAsIG1pbjogNiwgbWF4OiAyMiwgc3RlcDogMC4xICAgICAgICAgfVxuICAsIGltYWdld2lkdGggIDogeyB0eXBlIDogJ3JhbmdlJyAgLCBkZXNjcmlwdGlvbiA6ICdJbWFnZSBXaWR0aCcgLCBtaW46IDIwMCwgbWF4OiAyNDAwLCBzdGVwOiA1ICAgICAgIH1cbiAgLCBmcmFtZWhlaWdodCA6IHsgdHlwZSA6ICdyYW5nZScgICwgZGVzY3JpcHRpb24gOiAnRnJhbWUgSGVpZ2h0JywgbWluOiA2LCBtYXg6IDQwLCBzdGVwOiAwLjEgICAgICAgICB9XG4gICwgZm9udHdpZHRoICAgOiB7IHR5cGUgOiAncmFuZ2UnICAsIGRlc2NyaXB0aW9uIDogJ0ZvbnQgV2lkdGgnLCBtaW46IDAuMiwgbWF4OiAxLjAsIHN0ZXA6IDAuMDUgICAgICAgfVxuICAsIG1pbndpZHRoICAgIDogeyB0eXBlIDogJ3JhbmdlJyAgLCBkZXNjcmlwdGlvbiA6ICdNaW4gRnVuY3Rpb24gV2lkdGgnLCBtaW46IDAuMSwgbWF4OiAzMCwgc3RlcDogMC4xIH1cbiAgLCBjb3VudG5hbWUgICA6IHsgdHlwZSA6ICdzdHJpbmcnICAsIGRlc2NyaXB0aW9uIDogJ0NvdW50IE5hbWUnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgY29sb3JzICAgICAgOiB7IHR5cGUgOiAnc3RyaW5nJyAgLCBkZXNjcmlwdGlvbiA6ICdDb2xvciBUaGVtZScgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGJnY29sb3IxICAgIDogeyB0eXBlIDogJ2NvbG9yJyAgICwgZGVzY3JpcHRpb24gOiAnR3JhZGllbnQgc3RhcnQnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBiZ2NvbG9yMiAgICA6IHsgdHlwZSA6ICdjb2xvcicgICAsIGRlc2NyaXB0aW9uIDogJ0dyYWRpZW50IHN0b3AnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgdGltZW1heCAgICAgOiB7IHR5cGUgOiAnbnVtYmVyJyAgLCBkZXNjcmlwdGlvbiA6ICdUaW1lIE1heCcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGZhY3RvciAgICAgIDogeyB0eXBlIDogJ251bWJlcicgICwgZGVzY3JpcHRpb24gOiAnU2NhbGluZyBGYWN0b3InICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBoYXNoICAgICAgICA6IHsgdHlwZSA6ICdib29sZWFuJyAsIGRlc2NyaXB0aW9uIDogJ0NvbG9yIGJ5IEZ1bmN0aW9uIE5hbWUnICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgdGl0bGVzdHJpbmcgOiB7IHR5cGUgOiAnc3RyaW5nJyAgLCBkZXNjcmlwdGlvbiA6ICdUaXRsZScgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIG5hbWV0eXBlICAgIDogeyB0eXBlIDogJ3N0cmluZycgICwgZGVzY3JpcHRpb24gOiAnTmFtZScgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZm9udHR5cGUgICAgOiAnVmVyZGFuYScgICAgIC8vIGZvbnQgdHlwZVxuICAsIGZvbnRzaXplICAgIDogMTIgICAgICAgICAgICAvLyBiYXNlIHRleHQgc2l6ZVxuICAsIGltYWdld2lkdGggIDogMTIwMCAgICAgICAgICAvLyBtYXggd2lkdGgsIHBpeGVsc1xuICAsIGZyYW1laGVpZ2h0IDogMTYuMCAgICAgICAgICAvLyBtYXggaGVpZ2h0IGlzIGR5bmFtaWMgIFxuICAsIGZvbnR3aWR0aCAgIDogMC41OSAgICAgICAgICAvLyBhdmcgd2lkdGggcmVsYXRpdmUgdG8gZm9udHNpemVcbiAgLCBtaW53aWR0aCAgICA6IDAuMSAgICAgICAgICAgLy8gbWluIGZ1bmN0aW9uIHdpZHRoLCBwaXhlbHNcbiAgLCBjb3VudG5hbWUgICA6ICdzYW1wbGVzJyAgICAgLy8gd2hhdCBhcmUgdGhlIGNvdW50cyBpbiB0aGUgZGF0YT9cbiAgLCBjb2xvcnMgICAgICA6ICdob3QnICAgICAgICAgLy8gY29sb3IgdGhlbWVcbiAgLCBiZ2NvbG9yMSAgICA6ICcjZWVlZWVlJyAgICAgLy8gYmFja2dyb3VuZCBjb2xvciBncmFkaWVudCBzdGFydFxuICAsIGJnY29sb3IyICAgIDogJyNlZWVlYjAnICAgICAvLyBiYWNrZ3JvdW5kIGNvbG9yIGdyYWRpZW50IHN0b3BcbiAgLCB0aW1lbWF4ICAgICA6IEluZmluaXR5ICAgICAgLy8gKG92ZXJyaWRlIHRoZSkgc3VtIG9mIHRoZSBjb3VudHNcbiAgLCBmYWN0b3IgICAgICA6IDEgICAgICAgICAgICAgLy8gZmFjdG9yIHRvIHNjYWxlIGNvdW50cyBieVxuICAsIGhhc2ggICAgICAgIDogdHJ1ZSAgICAgICAgICAvLyBjb2xvciBieSBmdW5jdGlvbiBuYW1lXG4gICwgdGl0bGV0ZXh0ICAgOiAnRmxhbWUgR3JhcGgnIC8vIGNlbnRlcmVkIGhlYWRpbmdcbiAgLCBuYW1ldHlwZSAgICA6ICdGdW5jdGlvbjonICAgLy8gd2hhdCBhcmUgdGhlIG5hbWVzIGluIHRoZSBkYXRhP1xuXG4gIC8vIGJlbG93IGFyZSBub3Qgc3VwcG9ydGVkIGF0IHRoaXMgcG9pbnRcbiAgLCBwYWxldHRlICAgICA6IGZhbHNlICAgICAgICAgLy8gaWYgd2UgdXNlIGNvbnNpc3RlbnQgcGFsZXR0ZXMgKGRlZmF1bHQgb2ZmKVxuICAsIHBhbGV0dGVfbWFwIDoge30gICAgICAgICAgICAvLyBwYWxldHRlIG1hcCBoYXNoXG4gICwgcGFsX2ZpbGUgICAgOiAncGFsZXR0ZS5tYXAnIC8vIHBhbGV0dGUgbWFwIGZpbGUgbmFtZVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5zdHJ1bWVudHNSZWdleCA9IC9eUnVubmluZyBUaW1lLCAqU2VsZiwuKiwgKlN5bWJvbCBOYW1lLztcblxuLy8gbm9kZSAyMjYxMCAxMzEwOC4yMTEwMzg6IGNwdS1jbG9jazp1OiBcbnZhciBwZXJmUmVnZXggPSAvXlxcdysgK1xcZCsgK1xcZCtcXC5cXGQrOi87XG5cbmZ1bmN0aW9uIGZpcnN0TGluZShhcnIpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYXJyW2ldICYmIGFycltpXS5sZW5ndGgpIHJldHVybiBhcnJbaV07XG4gIH1cbn1cblxudmFyIGdvID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBmaXJzdCA9IGZpcnN0TGluZShhcnIpO1xuICBpZiAoIWZpcnN0KSByZXR1cm4gbnVsbDtcblxuICBpZiAoaW5zdHJ1bWVudHNSZWdleC50ZXN0KGZpcnN0KSkgcmV0dXJuICdpbnN0cnVtZW50cyc7XG4gIGlmIChwZXJmUmVnZXgudGVzdChmaXJzdCkpIHJldHVybiAncGVyZic7XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbnN0cnVtZW50cyA9IHJlcXVpcmUoJy4vY29sbGFwc2UtaW5zdHJ1bWVudHMnKVxuICAsIHBlcmYgPSByZXF1aXJlKCcuL2NvbGxhcHNlLXBlcmYnKVxuXG5mdW5jdGlvbiBnZXRDb2xsYXBzZXIodHlwZSkge1xuICBzd2l0Y2godHlwZSkge1xuICAgIGNhc2UgJ2luc3RydW1lbnRzJzpcbiAgICAgIHJldHVybiBpbnN0cnVtZW50cygpXG4gICAgY2FzZSAncGVyZic6XG4gICAgICByZXR1cm4gcGVyZigpXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biB0eXBlLCBjYW5ub3QgY29sbGFwc2UgXCInICsgdHlwZSArICdcIicpOyBcbiAgfVxufVxuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBcblxuLyoqXG4gKiBDb2xsYXBzZXMgYSBjYWxsZ3JhcGggaW5zaWRlIGEgZ2l2ZW4gbGluZXMgYXJyYXkgbGluZSBieSBsaW5lLlxuICogXG4gKiBAbmFtZSBmbGFtZWdyYXBoOjpzdGFja0NvbGxhcHNlLmFycmF5XG4gKiBAcHJpdmF0ZVxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSB0aGUgdHlwZSBvZiBpbnB1dCB0byBjb2xsYXBzZVxuICogQHBhcmFtIHtBcnJheS48c3RyaW5nPn0gYXJyIGxpbmVzIHRvIGNvbGxhcHNlXG4gKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gYXJyYXkgb2YgY29sbGFwc2VkIGxpbmVzXG4gKi9cbmZ1bmN0aW9uIHN0YWNrQ29sbGFwc2UodHlwZSwgYXJyKSB7XG4gIHZhciBjb2xsYXBzZXIgPSBnZXRDb2xsYXBzZXIodHlwZSk7XG5cbiAgZnVuY3Rpb24gb25saW5lIChsaW5lKSB7XG4gICAgY29sbGFwc2VyLmNvbGxhcHNlTGluZShsaW5lKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vbkVtcHR5KGxpbmUpIHtcbiAgICByZXR1cm4gbGluZSAmJiBsaW5lLmxlbmd0aDtcbiAgfVxuXG4gIGFyci5mb3JFYWNoKG9ubGluZSk7XG5cbiAgcmV0dXJuIGNvbGxhcHNlci5jb2xsYXBzZWRMaW5lcygpLmZpbHRlcihub25FbXB0eSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZWdleHAgPSAvXiguKilcXHMrKFxcZCsoPzpcXC5cXGQqKT8pJC87XG5cbmZ1bmN0aW9uIGxleGljYWxseShhLCBiKSB7XG4gIHJldHVybiAgYSA8IGIgPyAtMSBcbiAgICAgICAgOiBiIDwgYSA/ICAxIDogMDtcbn1cblxuZnVuY3Rpb24gc29ydChmdW5jdGlvbnMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9ucy5zb3J0KGxleGljYWxseSk7XG59XG5cbmZ1bmN0aW9uIGZsb3codG1wLCBub2RlcywgbGFzdCwgZnJhbWVzLCB0aW1lKSB7XG5cbiAgdmFyIGxlbkxhc3QgPSBsYXN0Lmxlbmd0aCAtIDFcbiAgICAsIGxlbkZyYW1lcyA9IGZyYW1lcy5sZW5ndGggLSAxXG4gICAgLCBpXG4gICAgLCBsZW5TYW1lXG4gICAgLCBrXG5cbiAgZm9yKGkgPSAwOyBpIDw9IGxlbkxhc3Q7IGkrKykge1xuICAgIGlmIChpID4gbGVuRnJhbWVzKSBicmVhaztcbiAgICBpZiAobGFzdFtpXSAhPT0gZnJhbWVzW2ldKSBicmVhaztcbiAgfVxuICBsZW5TYW1lID0gaTtcblxuICBmb3IoaSA9IGxlbkxhc3Q7IGkgPj0gbGVuU2FtZTsgaS0tKSB7XG4gICAgayA9IGxhc3RbaV0gKyAnOycgKyBpO1xuXHRcdC8vIGEgdW5pcXVlIElEIGlzIGNvbnN0cnVjdGVkIGZyb20gXCJmdW5jO2RlcHRoO2V0aW1lXCI7XG5cdFx0Ly8gZnVuYy1kZXB0aCBpc24ndCB1bmlxdWUsIGl0IG1heSBiZSByZXBlYXRlZCBsYXRlci5cbiAgICBub2Rlc1trICsgJzsnICsgdGltZV0gPSB7IGZ1bmM6IGxhc3RbaV0sIGRlcHRoOiBpLCBldGltZTogdGltZSwgc3RpbWU6IHRtcFtrXS5zdGltZSB9XG4gICAgdG1wW2tdID0gbnVsbDtcbiAgfVxuXG4gIGZvcihpID0gbGVuU2FtZTsgaSA8PSBsZW5GcmFtZXM7IGkrKykge1xuICAgIGsgPSBmcmFtZXNbaV0rICc7JyArIGk7XG4gICAgdG1wW2tdID0geyBzdGltZTogdGltZSB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyaW1MaW5lKGxpbmUpIHtcbiAgcmV0dXJuIGxpbmUudHJpbSgpO1xufVxuXG5mdW5jdGlvbiBub25lbXB0eShsaW5lKSB7XG4gIHJldHVybiBsaW5lLmxlbmd0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBcblxuLyoqXG4gKiBQYXJzZXMgY29sbGFwc2VkIGxpbmVzIGludG8gYSBub2RlcyBhcnJheS5cbiAqIFxuICogQG5hbWUgcGFyc2VJbnB1dFxuICogQHByaXZhdGVcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtBcnJheS48c3RyaW5nPn0gbGluZXMgY29sbGFwc2VkIGNhbGxncmFwaFxuICogQHJldHVybiB7T2JqZWN0fSAgXG4gKiAgLSBub2RlczogYXJyYXkgb2Ygbm9kZXMsIG9uZSBmb3IgZWFjaCBsaW5lIFxuICogIC0gdGltZTogdG90YWwgZXhlY3V0aW9uIHRpbWVcbiAqICAtIGlnbm9yZWQ6IGhvdyBtYW55IGxpbmVzIHdoZXJlIGlnbm9yZWRcbiAqL1xuZnVuY3Rpb24gcGFyc2VJbnB1dChsaW5lcykge1xuICB2YXIgaWdub3JlZCA9IDBcbiAgICAsIHRpbWUgPSAwXG4gICAgLCBsYXN0ID0gW11cbiAgICAsIHRtcCA9IHt9XG4gICAgLCBub2RlcyA9IHt9XG4gICAgO1xuXG4gIGZ1bmN0aW9uIHByb2Nlc3NMaW5lKGxpbmUpIHtcbiAgICB2YXIgZnJhbWVzO1xuXG4gICAgdmFyIG1hdGNoZXMgPSBsaW5lLm1hdGNoKHJlZ2V4cCk7XG4gICAgaWYgKCFtYXRjaGVzIHx8ICFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuO1xuXG4gICAgdmFyIHN0YWNrICAgPSBtYXRjaGVzWzFdO1xuICAgIHZhciBzYW1wbGVzID0gbWF0Y2hlc1syXTtcblxuICAgIGlmICghc2FtcGxlcykge1xuICAgICAgaWdub3JlZCsrO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN0YWNrID0gc3RhY2sucmVwbGFjZSgvPD4vZywgJygpJyk7XG4gICAgZnJhbWVzID0gc3RhY2suc3BsaXQoJzsnKTtcblxuICAgIGZsb3codG1wLCBub2RlcywgbGFzdCwgZnJhbWVzLCB0aW1lKTtcbiAgICB0aW1lICs9IHBhcnNlSW50KHNhbXBsZXMsIDEwKTtcblxuICAgIGxhc3QgPSBmcmFtZXM7XG4gIH1cblxuICBzb3J0KFxuICAgIGxpbmVzXG4gICAgICAubWFwKHRyaW1MaW5lKVxuICAgICAgLmZpbHRlcihub25lbXB0eSlcbiAgICApXG4gICAgLmZvckVhY2gocHJvY2Vzc0xpbmUpO1xuXG4gIGZsb3codG1wLCBub2RlcywgbGFzdCwgW10sIHRpbWUpO1xuXG4gIGlmIChpZ25vcmVkKSBjb25zb2xlLmVycm9yKCdJZ25vcmVkICVkIGxpbmVzIHdpdGggaW52YWxpZCBmb3JtYXQnKTtcbiAgaWYgKCF0aW1lKSB0aHJvdyBuZXcgRXJyb3IoJ05vIHN0YWNrIGNvdW50cyBmb3VuZCEnKTtcblxuICByZXR1cm4geyBub2Rlczogbm9kZXMsIHRpbWU6IHRpbWUsIGlnbm9yZWQ6IGlnbm9yZWQgfTtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyByZXNvbHZlZCB2aWEgaGJzZnkgdHJhbnNmb3JtXG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zdmcuaGJzJyk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSxkZXB0aHMpIHtcbiAgdmFyIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGJ1ZmZlciA9IFwiPGcgY2xhc3M9XFxcImZ1bmNfZ1xcXCIgb25tb3VzZW92ZXI9XFxcInMoJ1wiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwibmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuc2FtcGxlcyB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc2FtcGxlcyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJzYW1wbGVzXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIicpXFxcIiBvbm1vdXNlb3V0PVxcXCJjKClcXFwiPlxcbjx0aXRsZT5cIjtcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnNhbXBsZXMgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNhbXBsZXMgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic2FtcGxlc1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3RpdGxlPlxcbiAgPHJlY3QgeD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWN0X3ggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJlY3RfeCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJyZWN0X3hcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiB5PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJlY3RfeSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmVjdF95IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInJlY3RfeVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHdpZHRoPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJlY3RfdyB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmVjdF93IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInJlY3Rfd1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGhlaWdodD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWN0X2ggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJlY3RfaCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJyZWN0X2hcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBmaWxsPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJlY3RfZmlsbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmVjdF9maWxsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInJlY3RfZmlsbFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHJ4PVxcXCIyXFxcIiByeT1cXFwiMlxcXCIgLz5cXG5cXG5cIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNob3dUZXh0IDogZGVwdGgwKSwge1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDIsIGRhdGEsIGRlcHRocyksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgcmV0dXJuIGJ1ZmZlciArIFwiXFxuPC9nPlxcblwiO1xufSxcIjJcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhLGRlcHRocykge1xuICB2YXIgc3RhY2sxLCBoZWxwZXIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGhlbHBlck1pc3Npbmc9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgbGFtYmRhPXRoaXMubGFtYmRhLCBidWZmZXIgPSBcIjx0ZXh0IHRleHQtYW5jaG9yPVxcXCJcXFwiIHg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGV4dF94IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50ZXh0X3ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidGV4dF94XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgeT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50ZXh0X3kgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRleHRfeSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ0ZXh0X3lcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBmb250LXNpemU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKGxhbWJkYSgoZGVwdGhzWzJdICE9IG51bGwgPyBkZXB0aHNbMl0uZm9udHNpemUgOiBkZXB0aHNbMl0pLCBkZXB0aDApKVxuICAgICsgXCJcXFwiIGZvbnQtZmFtaWx5PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbihsYW1iZGEoKGRlcHRoc1syXSAhPSBudWxsID8gZGVwdGhzWzJdLmZvbnR0eXBlIDogZGVwdGhzWzJdKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIiBmaWxsPVxcXCJyZ2IoMCwwLDApXFxcIj5cIjtcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50ZXh0IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50ZXh0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRleHRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgcmV0dXJuIGJ1ZmZlciArIFwiPC90ZXh0PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSxkZXB0aHMpIHtcbiAgdmFyIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGJ1ZmZlciA9IFwiPD94bWwgdmVyc2lvbj1cXFwiMS4wXFxcIiBzdGFuZGFsb25lPVxcXCJub1xcXCI/PlxcbjwhRE9DVFlQRSBzdmcgUFVCTElDIFxcXCItLy9XM0MvL0RURCBTVkcgMS4xLy9FTlxcXCIgXFxcImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZFxcXCI+XFxuPHN2ZyB2ZXJzaW9uPVxcXCIxLjFcXFwiIHdpZHRoPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltYWdld2lkdGggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdld2lkdGggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2V3aWR0aFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGhlaWdodD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWFnZWhlaWdodCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2VoZWlnaHQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2VoZWlnaHRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBvbmxvYWQ9XFxcImluaXQoZXZ0KVxcXCIgdmlld0JveD1cXFwiMCAwIFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2V3aWR0aCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2V3aWR0aCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJpbWFnZXdpZHRoXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIiBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltYWdlaGVpZ2h0IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbWFnZWhlaWdodCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJpbWFnZWhlaWdodFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcbjxkZWZzPlxcblx0PGxpbmVhckdyYWRpZW50IGlkPVxcXCJiYWNrZ3JvdW5kXFxcIiB5MT1cXFwiMFxcXCIgeTI9XFxcIjFcXFwiIHgxPVxcXCIwXFxcIiB4Mj1cXFwiMFxcXCI+XFxuICAgIDxzdG9wIHN0b3AtY29sb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuYmdjb2xvcjEgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmJnY29sb3IxIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImJnY29sb3IxXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgb2Zmc2V0PVxcXCI1JVxcXCIgLz5cXG4gICAgPHN0b3Agc3RvcC1jb2xvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5iZ2NvbG9yMiB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuYmdjb2xvcjIgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiYmdjb2xvcjJcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBvZmZzZXQ9XFxcIjk1JVxcXCIgLz5cXG5cdDwvbGluZWFyR3JhZGllbnQ+XFxuPC9kZWZzPlxcbjxzdHlsZSB0eXBlPVxcXCJ0ZXh0L2Nzc1xcXCI+XFxuXHQuZnVuY19nOmhvdmVyIHsgc3Ryb2tlOmJsYWNrOyBzdHJva2Utd2lkdGg6MC41OyB9XFxuPC9zdHlsZT5cXG48c2NyaXB0IHR5cGU9XFxcInRleHQvamF2YXNjcmlwdFxcXCI+XFxuXHR2YXIgZGV0YWlscztcXG5cdGZ1bmN0aW9uIGluaXQoZXZ0KSB7IGRldGFpbHMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcXFwiZGV0YWlsc1xcXCIpLmZpcnN0Q2hpbGQ7IH1cXG4gIGZ1bmN0aW9uIHMoaW5mbykgeyBkZXRhaWxzLm5vZGVWYWx1ZSA9IFxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWV0eXBlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1ldHlwZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1ldHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI6IFxcXCIgKyBpbmZvOyB9XFxuXHRmdW5jdGlvbiBjKCkgeyBkZXRhaWxzLm5vZGVWYWx1ZSA9ICcgJzsgfVxcbjwvc2NyaXB0PlxcblxcbjxyZWN0IHg9XFxcIjAuMFxcXCIgeT1cXFwiMFxcXCIgd2lkdGg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2V3aWR0aCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2V3aWR0aCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJpbWFnZXdpZHRoXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgaGVpZ2h0PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltYWdlaGVpZ2h0IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbWFnZWhlaWdodCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJpbWFnZWhlaWdodFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGZpbGw9XFxcInVybCgjYmFja2dyb3VuZClcXFwiICAvPlxcbjx0ZXh0IHRleHQtYW5jaG9yPVxcXCJtaWRkbGVcXFwiIHg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGl0bGVYIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50aXRsZVggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidGl0bGVYXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgeT1cXFwiMjRcXFwiIGZvbnQtc2l6ZT1cXFwiMTdcXFwiIGZvbnQtZmFtaWx5PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZvbnR0eXBlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mb250dHlwZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJmb250dHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGZpbGw9XFxcInJnYigwLDAsMClcXFwiPlwiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnRpdGxldGV4dCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGl0bGV0ZXh0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRpdGxldGV4dFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3RleHQ+XFxuPHRleHQgdGV4dC1hbmNob3I9XFxcImxlZnRcXFwiIHg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMueHBhZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAueHBhZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ4cGFkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgeT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5kZXRhaWxzWSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZGV0YWlsc1kgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiZGV0YWlsc1lcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBmb250LXNpemU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZm9udHNpemUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZvbnRzaXplIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImZvbnRzaXplXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZm9udC1mYW1pbHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZm9udHR5cGUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZvbnR0eXBlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImZvbnR0eXBlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwicmdiKDAsMCwwKVxcXCIgaWQ9XFxcImRldGFpbHNcXFwiPiA8L3RleHQ+XFxuXFxuXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5vZGVzIDogZGVwdGgwKSwge1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgZGVwdGhzKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICByZXR1cm4gYnVmZmVyICsgXCJcXG48L3N2Zz5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZSxcInVzZURlcHRoc1wiOnRydWV9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKVxuICAsIHBhcnNlSW5wdXQgPSByZXF1aXJlKCcuL3N0YWNrcGFyc2UnKVxuICAsIGNvbnRleHRpZnkgPSByZXF1aXJlKCcuL2NvbnRleHRpZnknKVxuICAsIHN2Z1RlbXBsYXRlID0gcmVxdWlyZSgnLi9zdmctdGVtcGxhdGUnKVxuICAsIGRlZmF1bHRPcHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0LW9wdHMnKVxuXG52YXIgZ28gPSBtb2R1bGUuZXhwb3J0cyA9IFxuXG4vKipcbiAqIENyZWF0ZXMgYSBjb250ZXh0IGZyb20gYSBjYWxsIGdyYXBoIHRoYXQgaGFzIGJlZW4gY29sbGFwc2VkIChgc3RhY2tjb2xsYXBzZS0qYCkgYW5kIHJlbmRlcnMgc3ZnIGZyb20gaXQuXG4gKiBcbiAqIEBuYW1lIGZsYW1lZ3JhcGg6OnN2ZyBcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtBcnJheS48c3RyaW5nPn0gY29sbGFwc2VkTGluZXMgY2FsbGdyYXBoIHRoYXQgaGFzIGJlZW4gY29sbGFwc2VkXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBvcHRpb25zXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHN2ZyBcbiAqL1xuZnVuY3Rpb24gc3ZnKGNvbGxhcHNlZExpbmVzLCBvcHRzKSB7XG4gIG9wdHMgPSB4dGVuZChkZWZhdWx0T3B0cywgb3B0cyk7XG5cbiAgdmFyIHBhcnNlZCA9IHBhcnNlSW5wdXQoY29sbGFwc2VkTGluZXMpXG4gICAgLCBjb250ZXh0ID0gY29udGV4dGlmeShwYXJzZWQsIG9wdHMpXG5cbiAgcmV0dXJuIHN2Z1RlbXBsYXRlKGNvbnRleHQpO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xuLypnbG9iYWxzIEhhbmRsZWJhcnM6IHRydWUgKi9cbnZhciBiYXNlID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9iYXNlXCIpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3V0aWxzXCIpO1xudmFyIHJ1bnRpbWUgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3J1bnRpbWVcIik7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxudmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcbiAgaGIuRXhjZXB0aW9uID0gRXhjZXB0aW9uO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59O1xuXG52YXIgSGFuZGxlYmFycyA9IGNyZWF0ZSgpO1xuSGFuZGxlYmFycy5jcmVhdGUgPSBjcmVhdGU7XG5cbkhhbmRsZWJhcnNbJ2RlZmF1bHQnXSA9IEhhbmRsZWJhcnM7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gSGFuZGxlYmFyczsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBWRVJTSU9OID0gXCIyLjAuMFwiO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjt2YXIgQ09NUElMRVJfUkVWSVNJT04gPSA2O1xuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPT0gMS54LngnLFxuICA1OiAnPT0gMi4wLjAtYWxwaGEueCcsXG4gIDY6ICc+PSAyLjAuMC1iZXRhLjEnXG59O1xuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oLyogW2FyZ3MsIF1vcHRpb25zICovKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aC0xXS5uYW1lICsgXCInXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgICAgICBvcHRpb25zID0ge2RhdGE6IGRhdGF9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgdmFyIGNvbnRleHRQYXRoO1xuICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgIGNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG5cbiAgICAgICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7XG4gICAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuXG4gICAgICAgICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGtleTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGkgPT09IDApe1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCkgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pO1xuICAgICAgICBvcHRpb25zID0ge2RhdGE6ZGF0YX07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgbWVzc2FnZSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb29rdXAnLCBmdW5jdGlvbihvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAzLFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG1lc3NhZ2UpIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbnZhciBsb2cgPSBsb2dnZXIubG9nO1xuZXhwb3J0cy5sb2cgPSBsb2c7XG52YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIGZyYW1lID0gVXRpbHMuZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIHZhciBsaW5lO1xuICBpZiAobm9kZSAmJiBub2RlLmZpcnN0TGluZSkge1xuICAgIGxpbmUgPSBub2RlLmZpcnN0TGluZTtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgbm9kZS5maXJzdENvbHVtbjtcbiAgfVxuXG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICBpZiAobGluZSkge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBFeGNlcHRpb247IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gcmVxdWlyZShcIi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4vYmFzZVwiKS5SRVZJU0lPTl9DSEFOR0VTO1xudmFyIGNyZWF0ZUZyYW1lID0gcmVxdWlyZShcIi4vYmFzZVwiKS5jcmVhdGVGcmFtZTtcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICBlbnYuVk0uY2hlY2tSZXZpc2lvbih0ZW1wbGF0ZVNwZWMuY29tcGlsZXIpO1xuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIGluZGVudCwgbmFtZSwgY29udGV4dCwgaGFzaCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEsIGRlcHRocykge1xuICAgIGlmIChoYXNoKSB7XG4gICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBoYXNoKTtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSwgZGVwdGhzKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSwgZGVwdGhzOiBkZXB0aHMgfTtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgeyBkYXRhOiBkYXRhICE9PSB1bmRlZmluZWQsIGNvbXBhdDogdGVtcGxhdGVTcGVjLmNvbXBhdCB9LCBlbnYpO1xuICAgICAgcmVzdWx0ID0gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkge1xuICAgICAgaWYgKGluZGVudCkge1xuICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpbmVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmICghbGluZXNbaV0gJiYgaSArIDEgPT09IGwpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpbmVzW2ldID0gaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBsb29rdXA6IGZ1bmN0aW9uKGRlcHRocywgbmFtZSkge1xuICAgICAgdmFyIGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHRlbXBsYXRlU3BlY1tpXTtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGRhdGEsIGRlcHRocykge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZiAoZGF0YSB8fCBkZXB0aHMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBwcm9ncmFtKHRoaXMsIGksIGZuLCBkYXRhLCBkZXB0aHMpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uKGRhdGEsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAoZGF0YSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICByZXQgPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIHZhciByZXQgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XG5cbiAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICBkYXRhID0gaW5pdERhdGEoY29udGV4dCwgZGF0YSk7XG4gICAgfVxuICAgIHZhciBkZXB0aHM7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcbiAgICAgIGRlcHRocyA9IG9wdGlvbnMuZGVwdGhzID8gW2NvbnRleHRdLmNvbmNhdChvcHRpb25zLmRlcHRocykgOiBbY29udGV4dF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRlbXBsYXRlU3BlYy5tYWluLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBkYXRhLCBkZXB0aHMpO1xuICB9O1xuICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gIHJldC5fc2V0dXAgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwpIHtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIGVudi5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gIH07XG5cbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uKGksIGRhdGEsIGRlcHRocykge1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzICYmICFkZXB0aHMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ211c3QgcGFzcyBwYXJlbnQgZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtmdW5jdGlvbiBwcm9ncmFtKGNvbnRhaW5lciwgaSwgZm4sIGRhdGEsIGRlcHRocykge1xuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgb3B0aW9ucy5kYXRhIHx8IGRhdGEsIGRlcHRocyAmJiBbY29udGV4dF0uY29uY2F0KGRlcHRocykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gZGVwdGhzID8gZGVwdGhzLmxlbmd0aCA6IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEsIGRlcHRocykge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhLCBkZXB0aHM6IGRlcHRocyB9O1xuXG4gIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XG5cbmV4cG9ydHMubm9vcCA9IG5vb3A7ZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiAvKiAsIC4uLnNvdXJjZSAqLykge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7dmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZyArICcnO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtmdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59XG5cbmV4cG9ydHMuYXBwZW5kQ29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aDsiLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGhleEFkZHJlc3NSZWdleCA9IC8weCgoXFxkfFthYmNkZWZBQkNERUZdKXswLDJ9KSsvO1xuXG5mdW5jdGlvbiBieURlY2ltYWxBZGRyZXNzKGEsIGIpIHtcbiAgcmV0dXJuIGEuZGVjaW1hbEFkZHJlc3MgPCBiLmRlY2ltYWxBZGRyZXNzID8gLTEgOiAxO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzTGluZShhY2MsIHgpIHtcbiAgaWYgKCF4LnRyaW0oKS5sZW5ndGgpIHJldHVybiBhY2M7XG5cbiAgdmFyIHBhcnRzID0geC5zcGxpdCgvICsvKTtcbiAgaWYgKHBhcnRzLmxlbmd0aCA8IDMpIHJldHVybiBhY2M7XG5cbiAgdmFyIGRlY2ltYWwgPSBwYXJzZUludChwYXJ0c1swXSwgMTYpXG5cbiAgdmFyIGl0ZW0gPSB7IFxuICAgICAgYWRkcmVzcyAgICAgICAgOiBwYXJ0c1swXVxuICAgICwgc2l6ZSAgICAgICAgICAgOiBwYXJ0c1sxXVxuICAgICwgZGVjaW1hbEFkZHJlc3MgOiBkZWNpbWFsXG4gICAgLCBzeW1ib2wgICAgICAgICA6IHBhcnRzLnNsaWNlKDIpLmpvaW4oJyAnKSB9XG5cbiAgYWNjLnB1c2goaXRlbSk7XG4gIHJldHVybiBhY2M7XG59XG5cbi8qKlxuICogSW5zdGFudGlhdGVzIGEgSklUIHJlc29sdmVyIGZvciB0aGUgZ2l2ZW4gbWFwLlxuICogXG4gKiBAbmFtZSBKSVRSZXNvbHZlclxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheS48U3RyaW5nPn0gbWFwIGVpdGhlciBhIHN0cmluZyBvciBsaW5lcyB3aXRoIHNwYWNlIHNlcGFyYXRlZCBIZXhBZGRyZXNzLCBTaXplLCBTeW1ib2wgb24gZWFjaCBsaW5lXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBpbml0aWFsaXplZCBKSVQgcmVzb2x2ZXJcbiAqL1xuZnVuY3Rpb24gSklUUmVzb2x2ZXIobWFwKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBKSVRSZXNvbHZlcikpIHJldHVybiBuZXcgSklUUmVzb2x2ZXIobWFwKTtcbiAgXG4gIHZhciBsaW5lcyA9IEFycmF5LmlzQXJyYXkobWFwKSA/IG1hcCA6IG1hcC5zcGxpdCgnXFxuJylcbiAgdGhpcy5fYWRkcmVzc2VzID0gbGluZXNcbiAgICAucmVkdWNlKHByb2Nlc3NMaW5lLCBbXSlcbiAgICAuc29ydChieURlY2ltYWxBZGRyZXNzKVxuXG4gIHRoaXMuX2xlbiA9IHRoaXMuX2FkZHJlc3Nlcy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSklUUmVzb2x2ZXI7XG5cbnZhciBwcm90byA9IEpJVFJlc29sdmVyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBNYXRjaGVzIHRoZSBhZGRyZXNzIG9mIHRoZSBzeW1ib2wgb2Ygd2hpY2ggdGhlIGdpdmVuIGFkZHJlc3MgaXMgcGFydCBvZi5cbiAqIFxuICpcbiAqIEBuYW1lIEpJVFJlc29sdmVyOjpyZXNvbHZlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gaGV4QWRkcmVzcyB0aGUgaGV4YWRlY2ltYWwgYWRkcmVzcyBvZiB0aGUgYWRkcmVzcyB0byBjaGVja1xuICogQHJldHVybiB7T2JqZWN0fSBpbmZvIG9mIHRoZSBtYXRjaGluZyBzeW1ib2wgd2hpY2ggaW5jbHVkZXMgYWRkcmVzcywgc2l6ZSwgc3ltYm9sXG4gKi9cbnByb3RvLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlKGhleEFkZHJlc3MpIHtcbiAgdmFyIG1hdGNoID0gbnVsbDtcbiAgdmFyIGEgPSB0eXBlb2YgaGV4QWRkcmVzcyA9PT0gJ251bWJlcicgPyBoZXhBZGRyZXNzIDogcGFyc2VJbnQoaGV4QWRkcmVzcywgMTYpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbGVuOyBpKyspIHtcbiAgICAvLyBvbmNlIHdlIGhpdCBhIGxhcmdlciBhZGRyZXNzIHRoYXQgbWVhbnMgb3VyIHN5bWJvbC9mdW5jdGlvbiB0aGF0IHRoaXNcbiAgICAvLyBhZGRyZXNzIGlzIHBhcnQgb2Ygc3RhcnRzIGF0IHRoZSBwcmV2aW91cyBhZGRyZXNzXG4gICAgaWYoYSA8IHRoaXMuX2FkZHJlc3Nlc1tpXS5kZWNpbWFsQWRkcmVzcykgeyBcbiAgICAgIG1hdGNoID0gdGhpcy5fYWRkcmVzc2VzW2kgLSAxXTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWF0Y2g7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXRIZXhBZGRyZXNzKGxpbmUpIHtcbiAgdmFyIG0gPSBsaW5lLm1hdGNoKGhleEFkZHJlc3NSZWdleCk7XG4gIHJldHVybiBtICYmIG1bMF07XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgYWxsIHN5bWJvbHMgaW4gYSBnaXZlbiBzdGFjayBhbmQgcmVwbGFjZXMgdGhlbSBhY2NvcmRpbmdseVxuICogXG4gKiBAbmFtZSBKSVRSZXNvbHZlcjo6cmVzb2x2ZU11bHRpXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz58U3RyaW5nfSBzdGFjayBzdHJpbmcgb2Ygc3RhY2sgb3IgbGluZXMgb2Ygc3RhY2tcbiAqIEBwYXJhbSB7ZnVuY3Rpb249fSBnZXRIZXhBZGRyZXNzIGFsbG93cyBvdmVycmlkaW5nIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGZpbmQgYSBoZXggYWRkcmVzcyBvbiBlYWNoIGxpbmVcbiAqIEByZXR1cm4ge0FycmF5LjxTdHJpbmc+fFN0cmluZ30gdGhlIHN0YWNrIHdpdGggc3ltYm9scyByZXNvbHZlZCBpbiB0aGUgc2FtZSBmb3JtYXQgdGhhdCB0aGUgc3RhY2sgd2FzIGdpdmVuLCBlaXRoZXIgYXMgbGluZXMgb3Igb25lIHN0cmluZ1xuICovXG5wcm90by5yZXNvbHZlTXVsdGkgPSBmdW5jdGlvbiByZXNvbHZlTXVsdGkoc3RhY2ssIGdldEhleEFkZHJlc3MpIHtcbiAgZ2V0SGV4QWRkcmVzcyA9IGdldEhleEFkZHJlc3MgfHwgZGVmYXVsdEdldEhleEFkZHJlc3M7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgaXNMaW5lcyA9IEFycmF5LmlzQXJyYXkoc3RhY2spXG4gIHZhciBsaW5lcyA9IGlzTGluZXMgPyBzdGFjayA6IHN0YWNrLnNwbGl0KCdcXG4nKVxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NMaW5lKGxpbmUpIHtcbiAgICB2YXIgYWRkcmVzcyA9IGdldEhleEFkZHJlc3MobGluZSk7XG4gICAgaWYgKCFhZGRyZXNzKSByZXR1cm4gbGluZTtcblxuICAgIHZhciByZXNvbHZlZCA9IHNlbGYucmVzb2x2ZShhZGRyZXNzKTtcbiAgICBpZiAoIXJlc29sdmVkKSByZXR1cm4gbGluZTtcblxuICAgIHJldHVybiBsaW5lLnJlcGxhY2UoYWRkcmVzcywgcmVzb2x2ZWQuc3ltYm9sKTtcbiAgfVxuICBcbiAgdmFyIHByb2Nlc3NlZExpbmVzID0gbGluZXMubWFwKHByb2Nlc3NMaW5lKTtcblxuICByZXR1cm4gaXNMaW5lcyA/IHByb2Nlc3NlZExpbmVzIDogcHJvY2Vzc2VkTGluZXMuam9pbignXFxuJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuLypqc2hpbnQgYnJvd3NlcjogdHJ1ZSovXG5cbnZhciBmbGFtZWdyYXBoID0gcmVxdWlyZSgnLi4vJylcbiAgLCBqaXRSZXNvbHZlciA9IHJlcXVpcmUoJ3Jlc29sdmUtaml0LXN5bWJvbHMnKVxuICAsIHJlc29sdmVyO1xuXG52YXIgb3B0c1RlbXBsYXRlID0gcmVxdWlyZSgnLi9vcHRzLXRlbXBsYXRlLmhicycpO1xuXG52YXIgZmxhbWVncmFwaEVsICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZsYW1lZ3JhcGgnKTtcbnZhciBjYWxsZ3JhcGhGaWxlRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FsbGdyYXBoLWZpbGUnKVxudmFyIG1hcEZpbGVFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtZmlsZScpXG52YXIgb3B0aW9uc0VsICAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29wdGlvbnMnKTtcblxudmFyIGV4Y2x1ZGVPcHRpb25zID0gWyAnZm9udHR5cGUnLCAnZm9udHdpZHRoJywgJ2NvdW50bmFtZScsICdjb2xvcnMnLCAndGltZW1heCcsICdmYWN0b3InLCAnaGFzaCcsICd0aXRsZScsICd0aXRsZXN0cmluZycsICduYW1ldHlwZScsICdiZ2NvbG9yMScsICdiZ2NvbG9yMicgXTtcbnZhciB1c2VkTWV0YUtleXMgPSBPYmplY3Qua2V5cyhmbGFtZWdyYXBoLmRlZmF1bHRPcHRzTWV0YSkuZmlsdGVyKGZ1bmN0aW9uIChrKSB7IHJldHVybiAhfmV4Y2x1ZGVPcHRpb25zLmluZGV4T2YoaykgfSk7XG5cbnZhciBjdXJyZW50Rm9sZGVkO1xuXG5mdW5jdGlvbiByZW5kZXJPcHRpb25zKCkge1xuICB2YXIgb3B0cyA9IGZsYW1lZ3JhcGguZGVmYXVsdE9wdHNcbiAgICAsIG1ldGEgPSBmbGFtZWdyYXBoLmRlZmF1bHRPcHRzTWV0YTtcblxuICB2YXIgY29udGV4dCA9IHVzZWRNZXRhS2V5c1xuICAgIC5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgaykge1xuICAgICAgdmFyIHR5cGUgPSBtZXRhW2tdLnR5cGU7XG4gICAgICByZXR1cm4gYWNjLmNvbmNhdCh7XG4gICAgICAgICAgbmFtZSAgICAgICAgOiBrXG4gICAgICAgICwgdmFsdWUgICAgICAgOiBvcHRzW2tdXG4gICAgICAgICwgdHlwZSAgICAgICAgOiB0eXBlXG4gICAgICAgICwgZGVzY3JpcHRpb24gOiBtZXRhW2tdLmRlc2NyaXB0aW9uXG4gICAgICAgICwgbWluICAgICAgICAgOiBtZXRhW2tdLm1pblxuICAgICAgICAsIG1heCAgICAgICAgIDogbWV0YVtrXS5tYXhcbiAgICAgICAgLCBzdGVwICAgICAgICA6IG1ldGFba10uc3RlcFxuICAgICAgfSk7XG4gICAgfSwgW10pO1xuICB2YXIgaHRtbCA9IG9wdHNUZW1wbGF0ZShjb250ZXh0KTtcbiAgb3B0aW9uc0VsLmlubmVySFRNTCA9IGh0bWw7XG5cbiAgLy8gTmVlZCB0byBzZXQgdmFsdWUgaW4gSlMgc2luY2UgaXQncyBub3QgcGlja2VkIHVwIHdoZW4gc2V0IGluIGh0bWwgdGhhdCBpcyBhZGRlZCB0byBET00gYWZ0ZXJ3YXJkc1xuICB1c2VkTWV0YUtleXMgXG4gICAgLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciB2YWwgPSBvcHRzW2tdO1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoayk7XG4gICAgICBlbC52YWx1ZSA9IHZhbDtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0T3B0aW9ucygpIHtcbiAgdmFyIG1ldGEgPSBmbGFtZWdyYXBoLmRlZmF1bHRPcHRzTWV0YTtcblxuICB1c2VkTWV0YUtleXMgXG4gICAgLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrKSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChrKTtcbiAgICAgIHZhciB2YWwgPSBlbC52YWx1ZTtcbiAgICAgIGlmIChtZXRhW2tdLnR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHZhbCA9IHZhbC5sZW5ndGggPyBwYXJzZUZsb2F0KHZhbCkgOiBJbmZpbml0eTtcbiAgICAgIH0gZWxzZSBpZiAobWV0YVtrXS50eXBlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdmFsID0gdmFsLmxlbmd0aCA/IEJvb2xlYW4odmFsKSA6IGZhbHNlOyBcbiAgICAgIH1cbiAgICAgIGFjY1trXSA9IHZhbDtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgZmxhbWVncmFwaC5kZWZhdWx0T3B0cyk7XG59XG5cbmZ1bmN0aW9uIG9uT3B0aW9uc0NoYW5nZShlKSB7XG4gIHJlZnJlc2goKTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDaGFuZ2UoKSB7XG4gIHZhciBpbnB1dHMgPSBvcHRpb25zRWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylcbiAgICAsIGksIGVsO1xuICBcbiAgZm9yIChpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgIGVsID0gaW5wdXRzW2ldO1xuICAgIGVsLm9uY2hhbmdlID0gb25PcHRpb25zQ2hhbmdlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhvb2tIb3Zlck1ldGhvZHMoKSB7XG4gIHZhciBkZXRhaWxzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZXRhaWxzXCIpLmZpcnN0Q2hpbGQ7XG4gIHdpbmRvdy5zID0gZnVuY3Rpb24gcyhpbmZvKSB7IFxuICAgIGRldGFpbHMubm9kZVZhbHVlID0gXCJGdW5jdGlvbjogXCIgKyBpbmZvOyBcbiAgfVxuICB3aW5kb3cuYyA9IGZ1bmN0aW9uIGMoKSB7IFxuICAgIGRldGFpbHMubm9kZVZhbHVlID0gJyAnOyBcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXIoYXJyKSB7XG4gIHZhciBvcHRzID0gZ2V0T3B0aW9ucygpO1xuXG4gIHZhciBzdmc7XG4gIHRyeSB7XG4gICAgY3VycmVudEZvbGRlZCA9IGFycjtcbiAgICBzdmcgPSBmbGFtZWdyYXBoKGFyciwgb3B0cyk7XG4gICAgZmxhbWVncmFwaEVsLmlubmVySFRNTD0gc3ZnO1xuICAgIGhvb2tIb3Zlck1ldGhvZHMoKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmxhbWVncmFwaEVsLmlubmVySFRNTCA9ICc8YnI+PHAgY2xhc3M9XCJlcnJvclwiPicgKyBlcnIudG9TdHJpbmcoKSArICc8L3A+JztcbiAgfVxufVxuXG5mdW5jdGlvbiByZWZyZXNoKCkge1xuICBpZiAoIWN1cnJlbnRGb2xkZWQpIHJldHVybjtcbiAgcmVuZGVyKGN1cnJlbnRGb2xkZWQpO1xufVxuXG5mdW5jdGlvbiByZWFkRmlsZShmaWxlLCBjYikge1xuICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gIGZpbGVSZWFkZXIucmVhZEFzVGV4dChmaWxlLCAndXRmLTgnKTtcbiAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiBvbmxvYWQoZXJyKSB7XG4gICAgY2IoZXJyLCBmaWxlUmVhZGVyLnJlc3VsdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gb25GaWxlKGUsIHByb2Nlc3MpIHtcbiAgdmFyIGZpbGUgPSBlLnRhcmdldC5maWxlc1swXTtcbiAgaWYgKCFmaWxlKSByZXR1cm47XG4gIHJlYWRGaWxlKGZpbGUsIHByb2Nlc3MpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzQ2FsbGdyYXBoRmlsZShlKSB7XG4gIHZhciBhcnIgPSBlLnRhcmdldC5yZXN1bHQuc3BsaXQoJ1xcbicpO1xuICBpZiAocmVzb2x2ZXIpIGFyciA9IHJlc29sdmVyLnJlc29sdmVNdWx0aShhcnIpO1xuICByZW5kZXIoYXJyKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc01hcEZpbGUoZSkge1xuICB2YXIgbWFwID0gZS50YXJnZXQucmVzdWx0O1xuICByZXNvbHZlciA9IGppdFJlc29sdmVyKG1hcCk7XG4gIGlmIChjdXJyZW50Rm9sZGVkKSBjdXJyZW50Rm9sZGVkID0gcmVzb2x2ZXIucmVzb2x2ZU11bHRpKGN1cnJlbnRGb2xkZWQpO1xuICByZWZyZXNoKCk7XG59XG5cbmZ1bmN0aW9uIG9uQ2FsbGdyYXBoRmlsZShlKSB7XG4gIG9uRmlsZShlLCBwcm9jZXNzQ2FsbGdyYXBoRmlsZSk7XG59XG5cbmZ1bmN0aW9uIG9uTWFwRmlsZShlKSB7XG4gIG9uRmlsZShlLCBwcm9jZXNzTWFwRmlsZSk7XG59XG5cbi8vIEV2ZW50IExpc3RlbmVyc1xuY2FsbGdyYXBoRmlsZUVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIG9uQ2FsbGdyYXBoRmlsZSk7XG5tYXBGaWxlRWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgb25NYXBGaWxlKTtcblxuLy8gU2V0dXAgXG5yZW5kZXJPcHRpb25zKCk7XG5yZWdpc3RlckNoYW5nZSgpO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdmFyIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJvcHRpb25zLWlucHV0XFxcIj5cXG4gIDxwPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGVzY3JpcHRpb24gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRlc2NyaXB0aW9uIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImRlc2NyaXB0aW9uXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvcD5cXG4gIDxpbnB1dCB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnR5cGUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnR5cGUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgdmFsdWVcXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy52YWx1ZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudmFsdWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidmFsdWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBtaW49XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubWluIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5taW4gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwibWluXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgbWF4PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm1heCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubWF4IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcIm1heFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHN0ZXA9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuc3RlcCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc3RlcCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJzdGVwXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuPC9kaXY+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHZhciBzdGFjazEsIGJ1ZmZlciA9IFwiXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLCB7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICByZXR1cm4gYnVmZmVyO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iXX0=
