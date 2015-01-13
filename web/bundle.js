(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Volumes/d/dev/js/projects/flamegraph/index.js":[function(require,module,exports){
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
 * @param {boolean} opts.keepInternals  keep internal methods             default: `false`
 * @return {string} svg                 the rendered svg
 */
function flamegraph(arr, opts) {
  if (!Array.isArray(arr)) throw new TypeError('First arg needs to be an array of lines.');

  opts = opts || {};
  var collapsed = stackCollapseFromArray(arr, opts.inputtype);
  collapsed = filterLazy(collapsed, opts);
  if (!opts.internals) collapsed = filterInternals(collapsed, opts);
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

},{"./lib/default-opts":"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts.js","./lib/default-opts-meta":"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts-meta.js","./lib/detect-inputtype":"/Volumes/d/dev/js/projects/flamegraph/lib/detect-inputtype.js","./lib/filter-internals":"/Volumes/d/dev/js/projects/flamegraph/lib/filter-internals.js","./lib/filter-lazycompile":"/Volumes/d/dev/js/projects/flamegraph/lib/filter-lazycompile.js","./lib/stackcollapse":"/Volumes/d/dev/js/projects/flamegraph/lib/stackcollapse.js","./lib/svg":"/Volumes/d/dev/js/projects/flamegraph/lib/svg.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-instruments.js":[function(require,module,exports){
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-perf.js":[function(require,module,exports){
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

},{"util":"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/util/util.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/color-map.js":[function(require,module,exports){
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

},{"util":"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/util/util.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/contextify.js":[function(require,module,exports){
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
      , search    : name.toLowerCase()
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

},{"./color-map":"/Volumes/d/dev/js/projects/flamegraph/lib/color-map.js","util":"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/util/util.js","xtend":"/Volumes/d/dev/js/projects/flamegraph/node_modules/xtend/immutable.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts-meta.js":[function(require,module,exports){
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
  , internals: { type: 'checkbox' , description: 'Show Internals', checked: '' }
  , optimizationinfo: { type: 'checkbox' , description: 'Show Optimization Info', checked: '' }
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts.js":[function(require,module,exports){
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
  
  , internals: false
  , optimizationinfo: false
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/detect-inputtype.js":[function(require,module,exports){
'use strict';

var instrumentsRegex = /^Running Time, *Self,.*, *Symbol Name/;

// node 22610 13108.211038: cpu-clock:u: 
var perfRegex = /^\w+ +\d+ +\d+\.\d+:/;

function firstLine(arr) {
  for (var i = 0; i < arr.length; i++) {
    // ignore empty lines and comments starting with #
    if (arr[i] && arr[i].length && arr[i][0] !== '#') return arr[i];
  }
}

var go = module.exports = function (arr) {
  var first = firstLine(arr);
  if (!first) return null;

  if (instrumentsRegex.test(first)) return 'instruments';
  if (perfRegex.test(first)) return 'perf';

  return null;
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/filter-internals.js":[function(require,module,exports){
'use strict';

var v8Internals =
    '__libc_start|node::Start\\(' 
  + '|v8::internal::|v8::Function::Call|v8::Function::NewInstance' 
  + '|Builtin:|Stub:|StoreIC:|LoadIC:|LoadPolymorphicIC:|KeyedLoadIC:' 
  + '|<Unknown Address>|_platform_\\w+\\$VARIANT\\$|DYLD-STUB\\$|_os_lock_spin_lock'

var midHead  = '('
  , midTail  = ')[^;]+;'
  , lastHead = '(.+?);((?:'
  , lastTail = ')[^;]+?)( \\d+$)'

var v8MidRegex = new RegExp(midHead + v8Internals + midTail, 'g')
  , v8LastRegex = new RegExp(lastHead + v8Internals + lastTail)

function filterLine(l) {
  return l
    // just remove matches in between two semicolons, i.e.: ; .. ;
    .replace(v8MidRegex, '')
    // if it's the last function in the stack removal is a bit different since we no ; delimits the end
    // it's probably possible to handle both cases with one regex and speed things up
    // in the process, but this will work for now
    .replace(v8LastRegex, function replaceInternals(match, before, remove, after) {
      return before + after;
    })
}

var go = module.exports = 

/**
 * Filters internal functions from the given collapsed stack.
 *
 * NOTE: no actual lines are removed, instead they are modified to remove the internal functions.
 * 
 * @name filterInternals
 * @private
 * @function
 * @param {Array.<String>} collapsed callgraph data that has been collapsed
 * @return {Array.<String>} collapsed callgraph data with internal functions removed
 */
function filterInternals(collapsed) {
  return collapsed.map(filterLine);  
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/filter-lazycompile.js":[function(require,module,exports){
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/stackcollapse.js":[function(require,module,exports){
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

},{"./collapse-instruments":"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-instruments.js","./collapse-perf":"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-perf.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/stackparse.js":[function(require,module,exports){
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


},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/svg-client-template.js":[function(require,module,exports){
'use strict';

// resolved via hbsfy transform

module.exports = require('./svg.hbs');

},{"./svg.hbs":"/Volumes/d/dev/js/projects/flamegraph/lib/svg.hbs"}],"/Volumes/d/dev/js/projects/flamegraph/lib/svg.hbs":[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<g class=\"func_g\" onmouseover=\"s('";
  stack1 = ((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helper = (helper = helpers.samples || (depth0 != null ? depth0.samples : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"samples","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "')\" onmouseout=\"c()\" data-search=\"";
  stack1 = ((helper = (helper = helpers.search || (depth0 != null ? depth0.search : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"search","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\">\n<title>";
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
    + "\" data-width=\""
    + escapeExpression(((helper = (helper = helpers.rect_w || (depth0 != null ? depth0.rect_w : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_w","hash":{},"data":data}) : helper)))
    + "\" height=\""
    + escapeExpression(((helper = (helper = helpers.rect_h || (depth0 != null ? depth0.rect_h : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_h","hash":{},"data":data}) : helper)))
    + "\" data-height=\""
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

},{"hbsfy/runtime":"/Volumes/d/dev/js/projects/flamegraph/node_modules/hbsfy/runtime.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/svg.js":[function(require,module,exports){
'use strict';

var xtend           = require('xtend')
  , parseInput      = require('./stackparse')
  , contextify      = require('./contextify')
  , svgTemplate     = require('./svg-template')
  , defaultOpts     = require('./default-opts')

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

  return svgTemplate(context);
}

},{"./contextify":"/Volumes/d/dev/js/projects/flamegraph/lib/contextify.js","./default-opts":"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts.js","./stackparse":"/Volumes/d/dev/js/projects/flamegraph/lib/stackparse.js","./svg-template":"/Volumes/d/dev/js/projects/flamegraph/lib/svg-client-template.js","xtend":"/Volumes/d/dev/js/projects/flamegraph/node_modules/xtend/immutable.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/inherits/inherits_browser.js":[function(require,module,exports){
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/util/support/isBufferBrowser.js":[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/util/util.js":[function(require,module,exports){
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
},{"./support/isBuffer":"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/util/support/isBufferBrowser.js","_process":"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/process/browser.js","inherits":"/Volumes/d/dev/js/projects/flamegraph/node_modules/browserify/node_modules/inherits/inherits_browser.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/debounce/index.js":[function(require,module,exports){

/**
 * Module dependencies.
 */

var now = require('date-now');

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */

module.exports = function debounce(func, wait, immediate){
  var timeout, args, context, timestamp, result;
  if (null == wait) wait = 100;

  function later() {
    var last = now() - timestamp;

    if (last < wait && last > 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      }
    }
  };

  return function debounced() {
    context = this;
    args = arguments;
    timestamp = now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };
};

},{"date-now":"/Volumes/d/dev/js/projects/flamegraph/node_modules/debounce/node_modules/date-now/index.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/debounce/node_modules/date-now/index.js":[function(require,module,exports){
module.exports = Date.now || now

function now() {
    return new Date().getTime()
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars.runtime.js":[function(require,module,exports){
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
},{"./handlebars/base":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/base.js","./handlebars/exception":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js","./handlebars/runtime":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/runtime.js","./handlebars/safe-string":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/safe-string.js","./handlebars/utils":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/base.js":[function(require,module,exports){
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
},{"./exception":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js","./utils":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js":[function(require,module,exports){
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
},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/runtime.js":[function(require,module,exports){
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
},{"./base":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/base.js","./exception":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/exception.js","./utils":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/safe-string.js":[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/utils.js":[function(require,module,exports){
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
},{"./safe-string":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars/safe-string.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/runtime.js":[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/dist/cjs/handlebars.runtime.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/hbsfy/runtime.js":[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":"/Volumes/d/dev/js/projects/flamegraph/node_modules/handlebars/runtime.js"}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/resolve-jit-symbols/index.js":[function(require,module,exports){
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/xtend/immutable.js":[function(require,module,exports){
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/web/init-search.js":[function(require,module,exports){
'use strict';

var debounce = require('debounce')

var searchFieldEl = document.querySelector('.search.ui-part input[type=search]')
  , regexCheckEl = document.getElementById('search-regex')
  , blinkCheckEl = document.getElementById('search-blink')
  , searchErrorEl = document.getElementById('search-error')

function tryMakeRegex(query) {
  try {
    return new RegExp(query, 'i');
  } catch (e) {
    console.error(e);
    searchErrorEl.value = e.message;
  }
}

function addMatchIndicator(el) {
  el.classList.add('match');  
  var rect = el.children[1]
  var w = rect.getAttribute('width');
  var h = rect.getAttribute('height');
 
  // make invisible or too small nodes that matched the search visible
  // indicate that they were made visible by making them half as high
  if (w < 10) {
    rect.setAttribute('width', 10);
    rect.setAttribute('height', h / 2);
  }
}

function removeMatchIndicator(el) {
  el.classList.remove('match');  
  var rect = el.children[1]
  rect.setAttribute('width', parseInt(rect.dataset.width));
  rect.setAttribute('height', parseInt(rect.dataset.height));
}

function addBlink(el) {
  el.classList.add('blink');  
}

function removeBlink(el) {
  el.classList.remove('blink');  
}

function clearMatches() {
  var matches = document.querySelectorAll('g.func_g.match');
  for (var i = 0; i < matches.length; i++) {
    removeMatchIndicator(matches.item(i));  
  }
}

function clearBlinks() {
  var matches = document.querySelectorAll('g.func_g.blink');
  for (var i = 0; i < matches.length; i++) {
    removeBlink(matches.item(i));  
  }
}

function clearError() {
  searchErrorEl.value = '';
}

function indicateMatch(el, blink) {
  addMatchIndicator(el);
  if (blink) addBlink(el);
}

function onQueryChange() {
  clearMatches();
  clearBlinks();
  clearError();

  var query = searchFieldEl.value.trim();
  var isregex = regexCheckEl.checked;
  var blink = blinkCheckEl.checked;
  if (!query.length) return;

  var regex;
  if (isregex) { 
    regex = tryMakeRegex(query);
    if (!regex) return;
  } else {
    query = query.toLowerCase();
  }

  var func_gs = document.querySelectorAll('g.func_g');
  for (var i = 0; i < func_gs.length; i++) {
    var func_g = func_gs[i];

    if (isregex) {
      if (regex.test(func_g.dataset.search)) indicateMatch(func_g, blink);
    } else {
      if (~func_g.dataset.search.indexOf(query)) indicateMatch(func_g, blink);
    }
  }
}


var go = module.exports = function initSearch() {
  searchFieldEl.addEventListener('input', debounce(onQueryChange, 200));
  regexCheckEl.addEventListener('change', onQueryChange);
  blinkCheckEl.addEventListener('change', onQueryChange);
}

module.exports.refresh = onQueryChange;


},{"debounce":"/Volumes/d/dev/js/projects/flamegraph/node_modules/debounce/index.js"}],"/Volumes/d/dev/js/projects/flamegraph/web/main.js":[function(require,module,exports){
'use strict';
/*jshint browser: true*/

var flamegraph = require('../')
  , jitResolver = require('resolve-jit-symbols')
  , initSearch = require('./init-search')
  , resolver;

var optsTemplate = require('./opts-template.hbs');

var flamegraphEl    = document.getElementById('flamegraph');
var callgraphFileEl = document.getElementById('callgraph-file')
var mapFileEl       = document.getElementById('map-file')
var optionsEl       = document.getElementById('options');
var instructionsEl  = document.getElementById('instructions');

var excludeOptions = [ 'fonttype', 'fontwidth', 'countname', 'colors', 'timemax', 'factor', 'hash', 'title', 'titlestring', 'nametype', 'bgcolor1', 'bgcolor2' ];
var usedMetaKeys = Object.keys(flamegraph.defaultOptsMeta).filter(function (k) { return !~excludeOptions.indexOf(k) });

var currentCallgraph;

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

  return usedMetaKeys 
    .reduce(function (acc, k) {
      var el = document.getElementById(k);
      var val = el.value;
      if (meta[k].type === 'number') {
        val = val.length ? parseFloat(val) : Infinity;
      } else if (meta[k].type === 'boolean') {
        val = val.length ? Boolean(val) : false; 
      } else if (meta[k].type === 'checkbox') {
        val = el.checked ? true : false
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
  if (instructionsEl.parentElement) instructionsEl.parentElement.removeChild(instructionsEl);

  var opts = getOptions();

  var svg;
  try {
    currentCallgraph = arr;
    svg = flamegraph(arr, opts);
    flamegraphEl.innerHTML= svg;
    hookHoverMethods();
  } catch (err) {
    flamegraphEl.innerHTML = '<br><p class="error">' + err.toString() + '</p>';
  }
}

function refresh() {
  if (!currentCallgraph) return;
  render(currentCallgraph);
  initSearch.refresh();
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
  if (currentCallgraph) currentCallgraph = resolver.resolveMulti(currentCallgraph);
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
initSearch(flamegraphEl);

},{"../":"/Volumes/d/dev/js/projects/flamegraph/index.js","./init-search":"/Volumes/d/dev/js/projects/flamegraph/web/init-search.js","./opts-template.hbs":"/Volumes/d/dev/js/projects/flamegraph/web/opts-template.hbs","resolve-jit-symbols":"/Volumes/d/dev/js/projects/flamegraph/node_modules/resolve-jit-symbols/index.js"}],"/Volumes/d/dev/js/projects/flamegraph/web/opts-template.hbs":[function(require,module,exports){
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
    + "\" "
    + escapeExpression(((helper = (helper = helpers.checked || (depth0 != null ? depth0.checked : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"checked","hash":{},"data":data}) : helper)))
    + " min=\""
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

},{"hbsfy/runtime":"/Volumes/d/dev/js/projects/flamegraph/node_modules/hbsfy/runtime.js"}]},{},["/Volumes/d/dev/js/projects/flamegraph/web/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb2xsYXBzZS1pbnN0cnVtZW50cy5qcyIsImxpYi9jb2xsYXBzZS1wZXJmLmpzIiwibGliL2NvbG9yLW1hcC5qcyIsImxpYi9jb250ZXh0aWZ5LmpzIiwibGliL2RlZmF1bHQtb3B0cy1tZXRhLmpzIiwibGliL2RlZmF1bHQtb3B0cy5qcyIsImxpYi9kZXRlY3QtaW5wdXR0eXBlLmpzIiwibGliL2ZpbHRlci1pbnRlcm5hbHMuanMiLCJsaWIvZmlsdGVyLWxhenljb21waWxlLmpzIiwibGliL3N0YWNrY29sbGFwc2UuanMiLCJsaWIvc3RhY2twYXJzZS5qcyIsImxpYi9zdmctY2xpZW50LXRlbXBsYXRlLmpzIiwibGliL3N2Zy5oYnMiLCJsaWIvc3ZnLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2RlYm91bmNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RlYm91bmNlL25vZGVfbW9kdWxlcy9kYXRlLW5vdy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hic2Z5L3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvcmVzb2x2ZS1qaXQtc3ltYm9scy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy94dGVuZC9pbW11dGFibGUuanMiLCJ3ZWIvaW5pdC1zZWFyY2guanMiLCJ3ZWIvbWFpbi5qcyIsIndlYi9vcHRzLXRlbXBsYXRlLmhicyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZXRlY3RJbnB1dFR5cGUgPSByZXF1aXJlKCcuL2xpYi9kZXRlY3QtaW5wdXR0eXBlJylcbiAgLCBzdGFja0NvbGxhcHNlICAgPSByZXF1aXJlKCcuL2xpYi9zdGFja2NvbGxhcHNlJylcbiAgLCBzdmcgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9zdmcnKVxuICAsIGRlZmF1bHRPcHRzICAgICA9IHJlcXVpcmUoJy4vbGliL2RlZmF1bHQtb3B0cycpXG4gICwgZGVmYXVsdE9wdHNNZXRhID0gcmVxdWlyZSgnLi9saWIvZGVmYXVsdC1vcHRzLW1ldGEnKVxuICAsIGZpbHRlckludGVybmFscyA9IHJlcXVpcmUoJy4vbGliL2ZpbHRlci1pbnRlcm5hbHMnKVxuICAsIGZpbHRlckxhenkgICAgICA9IHJlcXVpcmUoJy4vbGliL2ZpbHRlci1sYXp5Y29tcGlsZScpXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9XG5cbi8qKlxuICogQ29udmVydHMgYW4gYXJyYXkgb2YgY2FsbCBncmFwaCBsaW5lcyBpbnRvIGFuIHN2ZyBkb2N1bWVudC5cbiAqIElmIGBvcHRzLmlucHV0dHlwZWAgaXMgbm90IGdpdmVuIGl0IHdpbGwgYmUgZGV0ZWN0ZWQgZnJvbSB0aGUgaW5wdXQuXG4gKlxuICogQG5hbWUgZmxhbWVncmFwaFxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0FycmF5LjxzdHJpbmc+fSBhcnIgICAgICBpbnB1dCBsaW5lcyB0byByZW5kZXIgc3ZnIGZvclxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgb2JqZWN0cyB0aGF0IGFmZmVjdCB0aGUgdmlzdWFsaXphdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuaW5wdXR0eXBlICAgICAgIHRoZSB0eXBlIG9mIGNhbGxncmFwaCBgaW5zdHJ1bWVudHMgfCBwZXJmYFxuICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuZm9udHR5cGUgICAgICAgIHR5cGUgb2YgZm9udCB0byB1c2UgICAgICAgICAgICAgICBkZWZhdWx0OiBgJ1ZlcmRhbmEnYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuZm9udHNpemUgICAgICAgIGJhc2UgdGV4dCBzaXplICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBgMTJgXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0cy5pbWFnZXdpZHRoICAgICAgbWF4IHdpZHRoLCBwaXhlbHMgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAxMjAwYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuZnJhbWVoZWlnaHQgICAgIG1heCBoZWlnaHQgaXMgZHluYW1pYyAgICAgICAgICAgICBkZWZhdWx0OiBgMTYuMGBcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLmZvbnR3aWR0aCAgICAgICBhdmcgd2lkdGggcmVsYXRpdmUgdG8gZm9udHNpemUgICAgZGVmYXVsdDogYDAuNTlgXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0cy5taW53aWR0aCAgICAgICAgbWluIGZ1bmN0aW9uIHdpZHRoLCBwaXhlbHMgICAgICAgIGRlZmF1bHQ6IGAwLjFgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5jb3VudG5hbWUgICAgICAgd2hhdCBhcmUgdGhlIGNvdW50cyBpbiB0aGUgZGF0YT8gIGRlZmF1bHQ6IGAnc2FtcGxlcydgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5jb2xvcnMgICAgICAgICAgY29sb3IgdGhlbWUgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAnaG90J2BcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmJnY29sb3IxICAgICAgICBiYWNrZ3JvdW5kIGNvbG9yIGdyYWRpZW50IHN0YXJ0ICAgZGVmYXVsdDogYCcjZWVlZWVlJ2BcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmJnY29sb3IyICAgICAgICBiYWNrZ3JvdW5kIGNvbG9yIGdyYWRpZW50IHN0b3AgICAgZGVmYXVsdDogYCcjZWVlZWIwJ2BcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLnRpbWVtYXggICAgICAgICAob3ZlcnJpZGUgdGhlKSBzdW0gb2YgdGhlIGNvdW50cyAgZGVmYXVsdDogYEluZmluaXR5YFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuZmFjdG9yICAgICAgICAgIGZhY3RvciB0byBzY2FsZSBjb3VudHMgYnkgICAgICAgICBkZWZhdWx0OiBgMWBcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5oYXNoICAgICAgICAgICBjb2xvciBieSBmdW5jdGlvbiBuYW1lICAgICAgICAgICAgZGVmYXVsdDogYHRydWVgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy50aXRsZXRleHQgICAgICAgY2VudGVyZWQgaGVhZGluZyAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAnRmxhbWUgR3JhcGgnYFxuICogQHBhcmFtIHtzdHJpbmd9IG9wdHMubmFtZXR5cGUgICAgICAgIHdoYXQgYXJlIHRoZSBuYW1lcyBpbiB0aGUgZGF0YT8gICBkZWZhdWx0OiBgJ0Z1bmN0aW9uOidgXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMua2VlcE9wdGltaXphdGlvbkluZm8ga2VlcCBmdW5jdGlvbiBvcHRpbWl6YXRpb24gaW5mb3JtYXRpb24gIGRlZmF1bHQ6IGBmYWxzZWBcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5rZWVwSW50ZXJuYWxzICBrZWVwIGludGVybmFsIG1ldGhvZHMgICAgICAgICAgICAgZGVmYXVsdDogYGZhbHNlYFxuICogQHJldHVybiB7c3RyaW5nfSBzdmcgICAgICAgICAgICAgICAgIHRoZSByZW5kZXJlZCBzdmdcbiAqL1xuZnVuY3Rpb24gZmxhbWVncmFwaChhcnIsIG9wdHMpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGFycikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZyBuZWVkcyB0byBiZSBhbiBhcnJheSBvZiBsaW5lcy4nKTtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgdmFyIGNvbGxhcHNlZCA9IHN0YWNrQ29sbGFwc2VGcm9tQXJyYXkoYXJyLCBvcHRzLmlucHV0dHlwZSk7XG4gIGNvbGxhcHNlZCA9IGZpbHRlckxhenkoY29sbGFwc2VkLCBvcHRzKTtcbiAgaWYgKCFvcHRzLmludGVybmFscykgY29sbGFwc2VkID0gZmlsdGVySW50ZXJuYWxzKGNvbGxhcHNlZCwgb3B0cyk7XG4gIHJldHVybiBzdmcoY29sbGFwc2VkLCBvcHRzKTtcbn1cblxudmFyIHN0YWNrQ29sbGFwc2VGcm9tQXJyYXkgPSBleHBvcnRzLnN0YWNrQ29sbGFwc2VGcm9tQXJyYXkgPSBcblxuLyoqXG4gKiBDb2xsYXBzZXMgYSBjYWxsZ3JhcGggaW5zaWRlIGEgZ2l2ZW4gbGluZXMgYXJyYXkgbGluZSBieSBsaW5lLlxuICogXG4gKiBAbmFtZSBmbGFtZWdyYXBoOjpzdGFja0NvbGxhcHNlRnJvbUFycmF5XG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoZSB0eXBlIG9mIGlucHV0IHRvIGNvbGxhcHNlIChpZiBub3Qgc3VwcGxpZWQgaXQgaXMgZGV0ZWN0ZWQgZnJvbSB0aGUgaW5wdXQpXG4gKiBAcGFyYW0ge0FycmF5LjxzdHJpbmc+fSBhcnIgbGluZXMgdG8gY29sbGFwc2VcbiAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBhcnJheSBvZiBjb2xsYXBzZWQgbGluZXNcbiAqL1xuZnVuY3Rpb24gc3RhY2tDb2xscGFzZUZyb21BcnJheSAoYXJyLCBpbnB1dFR5cGUpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGFycikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZyBuZWVkcyB0byBiZSBhbiBhcnJheSBvZiBsaW5lcy4nKTtcblxuICBpbnB1dFR5cGUgPSBpbnB1dFR5cGUgfHwgZGV0ZWN0SW5wdXRUeXBlKGFycik7XG4gIGlmICghaW5wdXRUeXBlKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGlucHV0IHR5cGUgZ2l2ZW4gYW5kIHVuYWJsZSB0byBkZXRlY3QgaXQgZm9yIHRoZSBnaXZlbiBpbnB1dCEnKTtcblxuICByZXR1cm4gc3RhY2tDb2xsYXBzZShpbnB1dFR5cGUsIGFycik7XG59XG5cbmV4cG9ydHMuc3RhY2tDb2xsYXBzZSAgID0gc3RhY2tDb2xsYXBzZTtcbmV4cG9ydHMuc3ZnICAgICAgICAgICAgID0gc3ZnO1xuZXhwb3J0cy5kZWZhdWx0T3B0cyAgICAgPSBkZWZhdWx0T3B0cztcbmV4cG9ydHMuZGVmYXVsdE9wdHNNZXRhID0gZGVmYXVsdE9wdHNNZXRhO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVnZXhwID0gLyhcXGQrKVxcLlxcZCttc1teLF0rLFxcZCssXFxzKywoXFxzKikoLispLztcblxuZnVuY3Rpb24gYWRkRnJhbWUoZikge1xuICByZXR1cm4gZiArICc7Jztcbn1cblxuZnVuY3Rpb24gSW5zdHJ1bWVudHNDb2xsYXBzZXIoKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBJbnN0cnVtZW50c0NvbGxhcHNlcikpIHJldHVybiBuZXcgSW5zdHJ1bWVudHNDb2xsYXBzZXIoKTtcblxuICB0aGlzLnN0YWNrID0gW107XG4gIHRoaXMuY29sbGFwc2VkID0gW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5zdHJ1bWVudHNDb2xsYXBzZXI7XG52YXIgcHJvdG8gPSBJbnN0cnVtZW50c0NvbGxhcHNlci5wcm90b3R5cGU7XG5cbnByb3RvLmNvbGxhcHNlTGluZSA9IGZ1bmN0aW9uIGNvbGxhcHNlTGluZShsaW5lKSB7XG4gIHZhciBtYXRjaGVzID0gbGluZS5tYXRjaChyZWdleHApO1xuICBpZiAoIW1hdGNoZXMgfHwgIW1hdGNoZXMubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIG1zICAgID0gbWF0Y2hlc1sxXTtcbiAgdmFyIGRlcHRoID0gbWF0Y2hlc1syXS5sZW5ndGg7XG5cbiAgdmFyIGZuICAgID0gbWF0Y2hlc1szXTtcbiAgdGhpcy5zdGFja1tkZXB0aF0gPSBmbjtcblxuICB2YXIgcmVzID0gJyc7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZGVwdGg7IGkrKykgcmVzICs9IGFkZEZyYW1lKHRoaXMuc3RhY2tbaV0pXG4gICAgXG4gIHJlcyArPSBmbiArICcgJyArIG1zICsgJ1xcbic7XG5cbiAgdGhpcy5jb2xsYXBzZWQucHVzaChyZXMudHJpbSgnXFxuJykpO1xufVxuXG5wcm90by5jb2xsYXBzZWRMaW5lcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuY29sbGFwc2VkO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZm9ybWF0ID0gcmVxdWlyZSgndXRpbCcpLmZvcm1hdDtcbnZhciBpbmNsdWRlUG5hbWUgPSB0cnVlO1xuXG5cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBkZXB0aCkge1xuICBjb25zb2xlLmVycm9yKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KG9iaiwgZmFsc2UsIGRlcHRoIHx8IDUsIHRydWUpKTtcbn1cblxuZnVuY3Rpb24gUGVyZkNvbGxhcHNlcihvcHRzKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQZXJmQ29sbGFwc2VyKSkgcmV0dXJuIG5ldyBQZXJmQ29sbGFwc2VyKG9wdHMpO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuICB0aGlzLmluY2x1ZGVQbmFtZSA9IHR5cGVvZiBvcHRzLmluY2x1ZGVQbmFtZSA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogb3B0cy5pbmNsdWRlUG5hbWVcbiAgdGhpcy5zdGFjayA9IHVuZGVmaW5lZDtcbiAgdGhpcy5wbmFtZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5jb2xsYXBzZWQgPSB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQZXJmQ29sbGFwc2VyO1xuXG52YXIgcHJvdG8gPSBQZXJmQ29sbGFwc2VyLnByb3RvdHlwZTtcblxucHJvdG8ucmVtZW1iZXJTdGFjayA9IGZ1bmN0aW9uIHJlbWVtYmVyU3RhY2soam9pbmVkU3RhY2ssIGNvdW50KSB7XG4gIGlmICghdGhpcy5jb2xsYXBzZWRbam9pbmVkU3RhY2tdKSB0aGlzLmNvbGxhcHNlZFtqb2luZWRTdGFja10gPSAwO1xuICB0aGlzLmNvbGxhcHNlZFtqb2luZWRTdGFja10gKz0gY291bnQ7XG59XG5cbnByb3RvLnVuc2hpZnRTdGFjayA9IGZ1bmN0aW9uIHVuc2hpZnRTdGFjayh2YWwpIHtcbiAgaWYgKCF0aGlzLnN0YWNrKSB0aGlzLnN0YWNrID0gWyB2YWwgXTtcbiAgZWxzZSB0aGlzLnN0YWNrLnVuc2hpZnQodmFsKTtcbn1cblxucHJvdG8uY29sbGFwc2VMaW5lID0gZnVuY3Rpb24gcGVyZkNvbGxhcHNlTGluZShsaW5lKSB7XG4gIHZhciBmdW5jLCBtb2Q7XG5cbiAgLy8gaWdub3JlIGNvbW1lbnRzXG4gIGlmICgvXiMvLnRlc3QobGluZSkpIHJldHVybjtcblxuICAvLyBlbXB0eSBsaW5lc1xuICBpZiAoIWxpbmUubGVuZ3RoKSB7XG4gICAgaWYgKHRoaXMucG5hbWUpIHRoaXMudW5zaGlmdFN0YWNrKHRoaXMucG5hbWUpO1xuICAgIGlmICh0aGlzLnN0YWNrKSB0aGlzLnJlbWVtYmVyU3RhY2sodGhpcy5zdGFjay5qb2luKCc7JyksIDEpO1xuICAgIHRoaXMuc3RhY2sgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5wbmFtZSA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBsaW5lcyBjb250YWluaW5nIHByb2Nlc3MgbmFtZVxuICB2YXIgbWF0Y2hlcyA9IGxpbmUubWF0Y2goL14oXFxTKylcXHMvKTtcbiAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlcy5sZW5ndGgpIHtcbiAgICBpZiAodGhpcy5pbmNsdWRlUG5hbWUpIHRoaXMucG5hbWUgPSBtYXRjaGVzWzFdO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIG1hdGNoZXMgPSBsaW5lLm1hdGNoKC9eXFxzKlxcdytcXHMqKC4rKSAoXFxTKykvKTtcbiAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlcy5sZW5ndGgpIHtcbiAgICBmdW5jID0gbWF0Y2hlc1sxXTtcbiAgICBcbiAgICAvLyBza2lwIHByb2Nlc3MgbmFtZXNcbiAgICBpZiAoKC9eXFwoLykudGVzdChmdW5jKSkgcmV0dXJuOyBcblxuICAgIHRoaXMudW5zaGlmdFN0YWNrKGZ1bmMpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnNvbGUud2FybignVW5yZWNvZ25pemVkIGxpbmU6IFwiJXNcIicsIGxpbmUpO1xufVxuXG5wcm90by5jb2xsYXBzZWRMaW5lcyA9IGZ1bmN0aW9uIGNvbGxhcHNlZExpbmVzKCkge1xuICB2YXIgY29sbGFwc2VkID0gdGhpcy5jb2xsYXBzZWQ7XG4gIHJldHVybiBPYmplY3Qua2V5cyhjb2xsYXBzZWQpXG4gICAgLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEgPCBiID8gLTEgOiAxIH0pXG4gICAgLm1hcChmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGZvcm1hdCgnJXMgJXMnLCBrLCBjb2xsYXBzZWRba10pO1xuICAgIH0pXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBmb3JtYXQgPSByZXF1aXJlKCd1dGlsJykuZm9ybWF0O1xuXG5mdW5jdGlvbiBzY2FsYXJSZXZlcnNlKHMpIHtcbiAgcmV0dXJuIHMuc3BsaXQoJycpLnJldmVyc2UoKS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gbmFtZUhhc2gobmFtZSkge1xuXHQvLyBHZW5lcmF0ZSBhIHZlY3RvciBoYXNoIGZvciB0aGUgbmFtZSBzdHJpbmcsIHdlaWdodGluZyBlYXJseSBvdmVyXG5cdC8vIGxhdGVyIGNoYXJhY3RlcnMuIFdlIHdhbnQgdG8gcGljayB0aGUgc2FtZSBjb2xvcnMgZm9yIGZ1bmN0aW9uXG5cdC8vIG5hbWVzIGFjcm9zcyBkaWZmZXJlbnQgZmxhbWUgZ3JhcGhzLlxuXHR2YXIgdmVjdG9yID0gMFxuXHQgICwgd2VpZ2h0ID0gMVxuXHQgICwgbWF4ID0gMVxuXHQgICwgbW9kID0gMTBcblx0ICAsIG9yZFxuXG5cdC8vIGlmIG1vZHVsZSBuYW1lIHByZXNlbnQsIHRydW5jIHRvIDFzdCBjaGFyXG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoLy4oLio/KWAvLCAnJyk7XG4gIHZhciBzcGxpdHMgPSBuYW1lLnNwbGl0KCcnKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzcGxpdHMubGVuZ3RoOyBpKyspIHtcbiAgICBvcmQgPSBzcGxpdHNbaV0uY2hhckNvZGVBdCgwKSAlIG1vZDtcbiAgICB2ZWN0b3IgKz0gKG9yZCAvIChtb2QrKyAtIDEpKSAqIHdlaWdodDtcbiAgICBtYXggKz0gd2VpZ2h0O1xuICAgIHdlaWdodCAqPSAwLjcwO1xuICAgIGlmIChtb2QgPiAxMikgYnJlYWs7XG4gIH1cblx0IFxuICByZXR1cm4gKDEgLSB2ZWN0b3IgLyBtYXgpO1xufVxuXG5mdW5jdGlvbiBjb2xvcih0eXBlLCBoYXNoLCBuYW1lKSB7XG4gIHZhciB2MSwgdjIsIHYzLCByLCBnLCBiO1xuICBpZiAoIXR5cGUpIHJldHVybiAncmdiKDAsIDAsIDApJztcblxuICBpZiAoaGFzaCkge1xuICAgIHYxID0gbmFtZUhhc2gobmFtZSk7XG4gICAgdjIgPSB2MyA9IG5hbWVIYXNoKHNjYWxhclJldmVyc2UobmFtZSkpO1xuICB9IGVsc2Uge1xuXHRcdHYxID0gTWF0aC5yYW5kb20oKSArIDE7XG5cdFx0djIgPSBNYXRoLnJhbmRvbSgpICsgMTtcblx0XHR2MyA9IE1hdGgucmFuZG9tKCkgKyAxO1xuICB9XG5cbiAgc3dpdGNoKHR5cGUpIHtcbiAgICBjYXNlICdob3QnOlxuICAgICAgciA9IDIwNSArIE1hdGgucm91bmQoNTAgKiB2Myk7XG4gICAgICBnID0gMCArIE1hdGgucm91bmQoMjMwICogdjEpO1xuICAgICAgYiA9IDAgKyBNYXRoLnJvdW5kKDU1ICogdjIpO1xuICAgICAgcmV0dXJuIGZvcm1hdCgncmdiKCVzLCAlcywgJXMpJyxyLCBnLCBiKTtcbiAgICBjYXNlICdtZW0nOlxuICAgICAgciA9IDA7XG4gICAgICBnID0gMTkwICsgTWF0aC5yb3VuZCg1MCAqIHYyKTtcbiAgICAgIGIgPSAwICsgTWF0aC5yb3VuZCgyMTAgKiB2MSk7XG4gICAgICByZXR1cm4gZm9ybWF0KCdyZ2IoJXMsICVzLCAlcyknLHIsIGcsIGIpO1xuICAgIGNhc2UgJ2lvJzpcbiAgICAgIHIgPSA4MCArIE1hdGgucm91bmQoNjAgKiB2MSk7XG4gICAgICBnID0gcjtcbiAgICAgIGIgPSAxOTAgKyBNYXRoLnJvdW5kKDU1ICogdjIpO1xuICAgICAgcmV0dXJuIGZvcm1hdCgncmdiKCVzLCAlcywgJXMpJyxyLCBnLCBiKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHR5cGUgJyArIHR5cGUpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gXG5cbi8qKlxuICogTWFwcyBhIGZ1bmN0aW9uIG5hbWUgdG8gYSBjb2xvciwgd2hpbGUgdHJ5aW5nIHRvIGNyZWF0ZSBzYW1lIGNvbG9ycyBmb3Igc2ltaWxhciBmdW5jdGlvbnMuXG4gKiBcbiAqIEBuYW1lIGNvbG9yTWFwXG4gKiBAZnVuY3Rpb25cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBwYWxldHRlTWFwIGN1cnJlbnQgbWFwIG9mIGNvbG9ycyBgZnVuYzogY29sb3JgXG4gKiBAcGFyYW0ge3N0cmluZ30gY29sb3JUaGVtZSB0aGVtZSBvZiBjb2xvcnMgdG8gYmUgdXNlZCBgaG90IHwgbWVtIHwgaW9gXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGhhc2ggaWYgdHJ1ZSBjb2xvcnMgd2lsbCBiZSBjcmVhdGVkIGZyb20gbmFtZSBoYXNoLCBvdGhlcndpc2UgdGhleSBhcmUgcmFuZG9tXG4gKiBAcGFyYW0ge3N0cmluZ30gZnVuYyB0aGUgZnVuY3Rpb24gbmFtZSBmb3Igd2hpY2ggdG8gc2VsZWN0IGEgY29sb3JcbiAqIEByZXR1cm4ge3N0cmluZ30gY29udGFpbmluZyBhbiByZ2IgY29sb3IsIGkuZS4gYCdyZ2IoMSwgMiwgMyknYFxuICovXG5mdW5jdGlvbiBjb2xvck1hcChwYWxldHRlTWFwLCBjb2xvclRoZW1lLCBoYXNoLCBmdW5jKSB7XG4gIGlmIChwYWxldHRlTWFwW2Z1bmNdKSByZXR1cm4gcGFsZXR0ZU1hcFtmdW5jXTtcbiAgcGFsZXR0ZU1hcFtmdW5jXSA9IGNvbG9yKGNvbG9yVGhlbWUsIGhhc2gsIGZ1bmMpO1xuICByZXR1cm4gcGFsZXR0ZU1hcFtmdW5jXTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKVxuICAsIGZvcm1hdCA9IHJlcXVpcmUoJ3V0aWwnKS5mb3JtYXRcbiAgLCBjb2xvck1hcCA9IHJlcXVpcmUoJy4vY29sb3ItbWFwJylcblxuZnVuY3Rpb24gaW5zcGVjdChvYmosIGRlcHRoKSB7XG4gIGNvbnNvbGUuZXJyb3IocmVxdWlyZSgndXRpbCcpLmluc3BlY3Qob2JqLCBmYWxzZSwgZGVwdGggfHwgNSwgdHJ1ZSkpO1xufVxuXG5mdW5jdGlvbiBvbmVEZWNpbWFsKHgpIHtcbiAgcmV0dXJuIChNYXRoLnJvdW5kKHggKiAxMCkgLyAxMCk7XG59XG5cbmZ1bmN0aW9uIGh0bWxFc2NhcGUocykge1xuICByZXR1cm4gc1xuICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7Jylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBcbiAgXG4vKipcbiAqIEV4dHJhY3RzIGEgY29udGV4dCBvYmplY3QgZnJvbSB0aGUgcGFyc2VkIGNhbGxncmFwaCBAc2VlIGBzdGFja3BhcnNlLmpzYC5cbiAqIFRoaXMgY29udGV4dCBjYW4gdGhlbiBiZSB1c2VkIHRvIGdlbmVyYXRlIHRoZSBzdmcgZmlsZSB2aWEgYSB0ZW1wbGF0ZS5cbiAqIFxuICogQG5hbWUgY29udGV4dGlmeVxuICogQHByaXZhdGVcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtPYmplY3R9IHBhcnNlZCBub2Rlc1xuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgb3B0aW9ucyB0aGF0IGFmZmVjdCB2aXN1YWwgYW5kIGhvdyB0aGUgbm9kZXMgYXJlIGZpbHRlcmVkXG4gKi9cbmZ1bmN0aW9uIGNvbnRleHRpZnkocGFyc2VkLCBvcHRzKSB7XG4gIHZhciB0aW1lICAgICAgID0gcGFyc2VkLnRpbWVcbiAgICAsIHRpbWVNYXggICAgPSBvcHRzLnRpbWVtYXhcbiAgICAsIHlwYWRUb3AgICAgPSBvcHRzLmZvbnRzaXplICogNCAgICAgICAgICAgLy8gcGFkIHRvcCwgaW5jbHVkZSB0aXRsZVxuICAgICwgeXBhZEJvdHRvbSA9IG9wdHMuZm9udHNpemUgKiAyICsgMTAgICAgICAvLyBwYWQgYm90dG9tLCBpbmNsdWRlIGxhYmVsc1xuICAgICwgeHBhZCAgICAgICA9IDEwICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwYWQgbGVmdCBhbmQgcmlnaHRcbiAgICAsIGRlcHRoTWF4ICAgPSAwXG4gICAgLCBmcmFtZUhlaWdodCA9IG9wdHMuZnJhbWVoZWlnaHRcbiAgICAsIHBhbGV0dGVNYXAgPSB7fVxuXG4gIGlmICh0aW1lTWF4IDwgdGltZSAmJiB0aW1lTWF4L3RpbWUgPiAwLjAyKSB7XG4gICAgY29uc29sZS5lcnJvcignU3BlY2lmaWVkIHRpbWVtYXggJWQgaXMgbGVzcyB0aGFuIGFjdHVhbCB0b3RhbCAlZCwgc28gaXQgd2lsbCBiZSBpZ25vcmVkJywgdGltZU1heCwgdGltZSk7XG4gICAgdGltZU1heCA9IEluZmluaXR5O1xuICB9XG5cbiAgdGltZU1heCA9IE1hdGgubWluKHRpbWUsIHRpbWVNYXgpO1xuXG4gIHZhciB3aWR0aFBlclRpbWUgPSAob3B0cy5pbWFnZXdpZHRoIC0gMiAqIHhwYWQpIC8gdGltZU1heFxuICAgICwgbWluV2lkdGhUaW1lID0gb3B0cy5taW53aWR0aCAvIHdpZHRoUGVyVGltZVxuXG4gIGZ1bmN0aW9uIHBydW5lTmFycm93QmxvY2tzKCkge1xuXG4gICAgZnVuY3Rpb24gbm9uTmFycm93QmxvY2soYWNjLCBrKSB7XG4gICAgICB2YXIgdmFsID0gcGFyc2VkLm5vZGVzW2tdO1xuICAgICAgaWYgKHR5cGVvZiB2YWwuc3RpbWUgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3Npbmcgc3RhcnQgZm9yICcgKyBrKTtcbiAgICAgIGlmICgodmFsLmV0aW1lIC0gdmFsLnN0aW1lKSA8IG1pbldpZHRoVGltZSkgcmV0dXJuIGFjYztcblxuICAgICAgYWNjW2tdID0gcGFyc2VkLm5vZGVzW2tdO1xuICAgICAgZGVwdGhNYXggPSBNYXRoLm1heCh2YWwuZGVwdGgsIGRlcHRoTWF4KTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcnNlZC5ub2RlcykucmVkdWNlKG5vbk5hcnJvd0Jsb2NrLCB7fSk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NOb2RlKG5vZGUpIHtcbiAgICB2YXIgZnVuYyAgPSBub2RlLmZ1bmNcbiAgICAgICwgZGVwdGggPSBub2RlLmRlcHRoXG4gICAgICAsIGV0aW1lID0gbm9kZS5ldGltZVxuICAgICAgLCBzdGltZSA9IG5vZGUuc3RpbWVcbiAgICAgICwgZmFjdG9yID0gb3B0cy5mYWN0b3JcbiAgICAgICwgY291bnROYW1lID0gb3B0cy5jb3VudG5hbWVcbiAgICAgICwgaXNSb290ID0gIWZ1bmMubGVuZ3RoICYmIGRlcHRoID09PSAwXG4gICAgO1xuXG4gICAgaWYgKGlzUm9vdCkgZXRpbWUgPSB0aW1lTWF4O1xuICAgIFxuICAgIHZhciBzYW1wbGVzID0gTWF0aC5yb3VuZCgoZXRpbWUgLSBzdGltZSAqIGZhY3RvcikgKiAxMCkgLyAxMFxuICAgICAgLCBzYW1wbGVzVHh0ID0gc2FtcGxlcy50b0xvY2FsZVN0cmluZygpXG4gICAgICAsIHBjdFxuICAgICAgLCBwY3RUeHRcbiAgICAgICwgZXNjYXBlZEZ1bmNcbiAgICAgICwgbmFtZVxuICAgICAgLCBzYW1wbGVJbmZvXG5cbiAgICBpZiAoaXNSb290KSB7XG4gICAgICBuYW1lID0gJ2FsbCc7XG4gICAgICBzYW1wbGVJbmZvID0gZm9ybWF0KCcoJXMgJXMsIDEwMCUpJywgc2FtcGxlc1R4dCwgY291bnROYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGN0ID0gTWF0aC5yb3VuZCgoMTAwICogc2FtcGxlcykgLyAodGltZU1heCAqIGZhY3RvcikgKiAxMCkgLyAxMFxuICAgICAgcGN0VHh0ID0gcGN0LnRvTG9jYWxlU3RyaW5nKClcbiAgICAgIGVzY2FwZWRGdW5jID0gaHRtbEVzY2FwZShmdW5jKTtcblxuICAgICAgbmFtZSA9IGVzY2FwZWRGdW5jO1xuICAgICAgc2FtcGxlSW5mbyA9IGZvcm1hdCgnKCVzICVzKSwgJXMlJSknLCBzYW1wbGVzVHh0LCBjb3VudE5hbWUsIHBjdFR4dCk7XG4gICAgfVxuXG4gICAgdmFyIHgxID0gb25lRGVjaW1hbCh4cGFkICsgc3RpbWUgKiB3aWR0aFBlclRpbWUpXG4gICAgICAsIHgyID0gb25lRGVjaW1hbCh4cGFkICsgZXRpbWUgKiB3aWR0aFBlclRpbWUpXG4gICAgICAsIHkxID0gb25lRGVjaW1hbChpbWFnZUhlaWdodCAtIHlwYWRCb3R0b20gLSAoZGVwdGggKyAxKSAqIGZyYW1lSGVpZ2h0ICsgMSlcbiAgICAgICwgeTIgPSBvbmVEZWNpbWFsKGltYWdlSGVpZ2h0IC0geXBhZEJvdHRvbSAtIGRlcHRoICogZnJhbWVIZWlnaHQpXG4gICAgICAsIGNoYXJzID0gKHgyIC0geDEpIC8gKG9wdHMuZm9udHNpemUgKiBvcHRzLmZvbnR3aWR0aClcbiAgICAgICwgc2hvd1RleHQgPSBmYWxzZVxuICAgICAgLCB0ZXh0XG4gICAgICAsIHRleHRfeFxuICAgICAgLCB0ZXh0X3lcblxuICAgIGlmIChjaGFycyA+PSAzICkgeyAvLyBlbm91Z2ggcm9vbSB0byBkaXNwbGF5IGZ1bmN0aW9uIG5hbWU/XG4gICAgICBzaG93VGV4dCA9IHRydWU7XG4gICAgICB0ZXh0ID0gZnVuYy5zbGljZSgwLCBjaGFycyk7XG4gICAgICBpZiAoY2hhcnMgPCBmdW5jLmxlbmd0aCkgdGV4dCA9IHRleHQuc2xpY2UoMCwgY2hhcnMgLSAyKSArICcuLic7XG4gICAgICB0ZXh0ID0gaHRtbEVzY2FwZSh0ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lICAgICAgOiBuYW1lXG4gICAgICAsIHNlYXJjaCAgICA6IG5hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgLCBzYW1wbGVzICAgOiBzYW1wbGVJbmZvXG4gICAgICAsIHJlY3RfeCAgICA6IHgxXG4gICAgICAsIHJlY3RfeSAgICA6IHkxXG4gICAgICAsIHJlY3RfdyAgICA6IHgyIC0geDFcbiAgICAgICwgcmVjdF9oICAgIDogeTIgLSB5MVxuICAgICAgLCByZWN0X2ZpbGwgOiBjb2xvck1hcChwYWxldHRlTWFwLCBvcHRzLmNvbG9ycywgb3B0cy5oYXNoLCBmdW5jKVxuICAgICAgLCBzaG93VGV4dCAgOiBzaG93VGV4dFxuICAgICAgLCB0ZXh0ICAgICAgOiB0ZXh0XG4gICAgICAsIHRleHRfeCAgICA6IHgxICsgM1xuICAgICAgLCB0ZXh0X3kgICAgOiAzICsgKHkxICsgeTIpIC8gMlxuICAgIH1cbiAgfVxuXG4gIHZhciBub2RlcyA9IHBydW5lTmFycm93QmxvY2tzKCk7XG5cbiAgdmFyIGltYWdlSGVpZ2h0ID0gKGRlcHRoTWF4ICogZnJhbWVIZWlnaHQpICsgeXBhZFRvcCArIHlwYWRCb3R0b207XG4gIHZhciBjdHggPSB4dGVuZChvcHRzLCB7XG4gICAgICBpbWFnZWhlaWdodCA6IGltYWdlSGVpZ2h0XG4gICAgLCB4cGFkICAgICAgICA6IHhwYWRcbiAgICAsIHRpdGxlWCAgICAgIDogb3B0cy5pbWFnZXdpZHRoIC8gMlxuICAgICwgZGV0YWlsc1kgICAgOiBpbWFnZUhlaWdodCAtIChmcmFtZUhlaWdodCAvIDIpIFxuICB9KTtcblxuICBjdHgubm9kZXMgPSBPYmplY3Qua2V5cyhub2RlcylcbiAgICAucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGspIHtcbiAgICAgIGFjYy5wdXNoKHByb2Nlc3NOb2RlKG5vZGVzW2tdKSk7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIFtdKTtcbiAgcmV0dXJuIGN0eDtcbn0gXG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGZvbnR0eXBlICAgIDogeyB0eXBlIDogJ3N0cmluZycgICwgZGVzY3JpcHRpb24gOiAnRm9udCBUeXBlJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBmb250c2l6ZSAgICA6IHsgdHlwZSA6ICdyYW5nZScgICAsIGRlc2NyaXB0aW9uIDogJ0ZvbnQgU2l6ZScgICwgbWluOiA2LCBtYXg6IDIyLCBzdGVwOiAwLjEgICAgICAgICB9XG4gICwgaW1hZ2V3aWR0aCAgOiB7IHR5cGUgOiAncmFuZ2UnICAsIGRlc2NyaXB0aW9uIDogJ0ltYWdlIFdpZHRoJyAsIG1pbjogMjAwLCBtYXg6IDI0MDAsIHN0ZXA6IDUgICAgICAgfVxuICAsIGZyYW1laGVpZ2h0IDogeyB0eXBlIDogJ3JhbmdlJyAgLCBkZXNjcmlwdGlvbiA6ICdGcmFtZSBIZWlnaHQnLCBtaW46IDYsIG1heDogNDAsIHN0ZXA6IDAuMSAgICAgICAgIH1cbiAgLCBmb250d2lkdGggICA6IHsgdHlwZSA6ICdyYW5nZScgICwgZGVzY3JpcHRpb24gOiAnRm9udCBXaWR0aCcsIG1pbjogMC4yLCBtYXg6IDEuMCwgc3RlcDogMC4wNSAgICAgICB9XG4gICwgbWlud2lkdGggICAgOiB7IHR5cGUgOiAncmFuZ2UnICAsIGRlc2NyaXB0aW9uIDogJ01pbiBGdW5jdGlvbiBXaWR0aCcsIG1pbjogMC4xLCBtYXg6IDMwLCBzdGVwOiAwLjEgfVxuICAsIGNvdW50bmFtZSAgIDogeyB0eXBlIDogJ3N0cmluZycgICwgZGVzY3JpcHRpb24gOiAnQ291bnQgTmFtZScgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBjb2xvcnMgICAgICA6IHsgdHlwZSA6ICdzdHJpbmcnICAsIGRlc2NyaXB0aW9uIDogJ0NvbG9yIFRoZW1lJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgYmdjb2xvcjEgICAgOiB7IHR5cGUgOiAnY29sb3InICAgLCBkZXNjcmlwdGlvbiA6ICdHcmFkaWVudCBzdGFydCcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGJnY29sb3IyICAgIDogeyB0eXBlIDogJ2NvbG9yJyAgICwgZGVzY3JpcHRpb24gOiAnR3JhZGllbnQgc3RvcCcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCB0aW1lbWF4ICAgICA6IHsgdHlwZSA6ICdudW1iZXInICAsIGRlc2NyaXB0aW9uIDogJ1RpbWUgTWF4JyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgZmFjdG9yICAgICAgOiB7IHR5cGUgOiAnbnVtYmVyJyAgLCBkZXNjcmlwdGlvbiA6ICdTY2FsaW5nIEZhY3RvcicgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGhhc2ggICAgICAgIDogeyB0eXBlIDogJ2Jvb2xlYW4nICwgZGVzY3JpcHRpb24gOiAnQ29sb3IgYnkgRnVuY3Rpb24gTmFtZScgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCB0aXRsZXN0cmluZyA6IHsgdHlwZSA6ICdzdHJpbmcnICAsIGRlc2NyaXB0aW9uIDogJ1RpdGxlJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgbmFtZXR5cGUgICAgOiB7IHR5cGUgOiAnc3RyaW5nJyAgLCBkZXNjcmlwdGlvbiA6ICdOYW1lJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGludGVybmFsczogeyB0eXBlOiAnY2hlY2tib3gnICwgZGVzY3JpcHRpb246ICdTaG93IEludGVybmFscycsIGNoZWNrZWQ6ICcnIH1cbiAgLCBvcHRpbWl6YXRpb25pbmZvOiB7IHR5cGU6ICdjaGVja2JveCcgLCBkZXNjcmlwdGlvbjogJ1Nob3cgT3B0aW1pemF0aW9uIEluZm8nLCBjaGVja2VkOiAnJyB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGZvbnR0eXBlICAgIDogJ1ZlcmRhbmEnICAgICAvLyBmb250IHR5cGVcbiAgLCBmb250c2l6ZSAgICA6IDEyICAgICAgICAgICAgLy8gYmFzZSB0ZXh0IHNpemVcbiAgLCBpbWFnZXdpZHRoICA6IDEyMDAgICAgICAgICAgLy8gbWF4IHdpZHRoLCBwaXhlbHNcbiAgLCBmcmFtZWhlaWdodCA6IDE2LjAgICAgICAgICAgLy8gbWF4IGhlaWdodCBpcyBkeW5hbWljICBcbiAgLCBmb250d2lkdGggICA6IDAuNTkgICAgICAgICAgLy8gYXZnIHdpZHRoIHJlbGF0aXZlIHRvIGZvbnRzaXplXG4gICwgbWlud2lkdGggICAgOiAwLjEgICAgICAgICAgIC8vIG1pbiBmdW5jdGlvbiB3aWR0aCwgcGl4ZWxzXG4gICwgY291bnRuYW1lICAgOiAnc2FtcGxlcycgICAgIC8vIHdoYXQgYXJlIHRoZSBjb3VudHMgaW4gdGhlIGRhdGE/XG4gICwgY29sb3JzICAgICAgOiAnaG90JyAgICAgICAgIC8vIGNvbG9yIHRoZW1lXG4gICwgYmdjb2xvcjEgICAgOiAnI2VlZWVlZScgICAgIC8vIGJhY2tncm91bmQgY29sb3IgZ3JhZGllbnQgc3RhcnRcbiAgLCBiZ2NvbG9yMiAgICA6ICcjZWVlZWIwJyAgICAgLy8gYmFja2dyb3VuZCBjb2xvciBncmFkaWVudCBzdG9wXG4gICwgdGltZW1heCAgICAgOiBJbmZpbml0eSAgICAgIC8vIChvdmVycmlkZSB0aGUpIHN1bSBvZiB0aGUgY291bnRzXG4gICwgZmFjdG9yICAgICAgOiAxICAgICAgICAgICAgIC8vIGZhY3RvciB0byBzY2FsZSBjb3VudHMgYnlcbiAgLCBoYXNoICAgICAgICA6IHRydWUgICAgICAgICAgLy8gY29sb3IgYnkgZnVuY3Rpb24gbmFtZVxuICAsIHRpdGxldGV4dCAgIDogJ0ZsYW1lIEdyYXBoJyAvLyBjZW50ZXJlZCBoZWFkaW5nXG4gICwgbmFtZXR5cGUgICAgOiAnRnVuY3Rpb246JyAgIC8vIHdoYXQgYXJlIHRoZSBuYW1lcyBpbiB0aGUgZGF0YT9cblxuICAvLyBiZWxvdyBhcmUgbm90IHN1cHBvcnRlZCBhdCB0aGlzIHBvaW50XG4gICwgcGFsZXR0ZSAgICAgOiBmYWxzZSAgICAgICAgIC8vIGlmIHdlIHVzZSBjb25zaXN0ZW50IHBhbGV0dGVzIChkZWZhdWx0IG9mZilcbiAgLCBwYWxldHRlX21hcCA6IHt9ICAgICAgICAgICAgLy8gcGFsZXR0ZSBtYXAgaGFzaFxuICAsIHBhbF9maWxlICAgIDogJ3BhbGV0dGUubWFwJyAvLyBwYWxldHRlIG1hcCBmaWxlIG5hbWVcbiAgXG4gICwgaW50ZXJuYWxzOiBmYWxzZVxuICAsIG9wdGltaXphdGlvbmluZm86IGZhbHNlXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbnN0cnVtZW50c1JlZ2V4ID0gL15SdW5uaW5nIFRpbWUsICpTZWxmLC4qLCAqU3ltYm9sIE5hbWUvO1xuXG4vLyBub2RlIDIyNjEwIDEzMTA4LjIxMTAzODogY3B1LWNsb2NrOnU6IFxudmFyIHBlcmZSZWdleCA9IC9eXFx3KyArXFxkKyArXFxkK1xcLlxcZCs6LztcblxuZnVuY3Rpb24gZmlyc3RMaW5lKGFycikge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgIC8vIGlnbm9yZSBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHMgc3RhcnRpbmcgd2l0aCAjXG4gICAgaWYgKGFycltpXSAmJiBhcnJbaV0ubGVuZ3RoICYmIGFycltpXVswXSAhPT0gJyMnKSByZXR1cm4gYXJyW2ldO1xuICB9XG59XG5cbnZhciBnbyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFycikge1xuICB2YXIgZmlyc3QgPSBmaXJzdExpbmUoYXJyKTtcbiAgaWYgKCFmaXJzdCkgcmV0dXJuIG51bGw7XG5cbiAgaWYgKGluc3RydW1lbnRzUmVnZXgudGVzdChmaXJzdCkpIHJldHVybiAnaW5zdHJ1bWVudHMnO1xuICBpZiAocGVyZlJlZ2V4LnRlc3QoZmlyc3QpKSByZXR1cm4gJ3BlcmYnO1xuXG4gIHJldHVybiBudWxsO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdjhJbnRlcm5hbHMgPVxuICAgICdfX2xpYmNfc3RhcnR8bm9kZTo6U3RhcnRcXFxcKCcgXG4gICsgJ3x2ODo6aW50ZXJuYWw6Onx2ODo6RnVuY3Rpb246OkNhbGx8djg6OkZ1bmN0aW9uOjpOZXdJbnN0YW5jZScgXG4gICsgJ3xCdWlsdGluOnxTdHViOnxTdG9yZUlDOnxMb2FkSUM6fExvYWRQb2x5bW9ycGhpY0lDOnxLZXllZExvYWRJQzonIFxuICArICd8PFVua25vd24gQWRkcmVzcz58X3BsYXRmb3JtX1xcXFx3K1xcXFwkVkFSSUFOVFxcXFwkfERZTEQtU1RVQlxcXFwkfF9vc19sb2NrX3NwaW5fbG9jaydcblxudmFyIG1pZEhlYWQgID0gJygnXG4gICwgbWlkVGFpbCAgPSAnKVteO10rOydcbiAgLCBsYXN0SGVhZCA9ICcoLis/KTsoKD86J1xuICAsIGxhc3RUYWlsID0gJylbXjtdKz8pKCBcXFxcZCskKSdcblxudmFyIHY4TWlkUmVnZXggPSBuZXcgUmVnRXhwKG1pZEhlYWQgKyB2OEludGVybmFscyArIG1pZFRhaWwsICdnJylcbiAgLCB2OExhc3RSZWdleCA9IG5ldyBSZWdFeHAobGFzdEhlYWQgKyB2OEludGVybmFscyArIGxhc3RUYWlsKVxuXG5mdW5jdGlvbiBmaWx0ZXJMaW5lKGwpIHtcbiAgcmV0dXJuIGxcbiAgICAvLyBqdXN0IHJlbW92ZSBtYXRjaGVzIGluIGJldHdlZW4gdHdvIHNlbWljb2xvbnMsIGkuZS46IDsgLi4gO1xuICAgIC5yZXBsYWNlKHY4TWlkUmVnZXgsICcnKVxuICAgIC8vIGlmIGl0J3MgdGhlIGxhc3QgZnVuY3Rpb24gaW4gdGhlIHN0YWNrIHJlbW92YWwgaXMgYSBiaXQgZGlmZmVyZW50IHNpbmNlIHdlIG5vIDsgZGVsaW1pdHMgdGhlIGVuZFxuICAgIC8vIGl0J3MgcHJvYmFibHkgcG9zc2libGUgdG8gaGFuZGxlIGJvdGggY2FzZXMgd2l0aCBvbmUgcmVnZXggYW5kIHNwZWVkIHRoaW5ncyB1cFxuICAgIC8vIGluIHRoZSBwcm9jZXNzLCBidXQgdGhpcyB3aWxsIHdvcmsgZm9yIG5vd1xuICAgIC5yZXBsYWNlKHY4TGFzdFJlZ2V4LCBmdW5jdGlvbiByZXBsYWNlSW50ZXJuYWxzKG1hdGNoLCBiZWZvcmUsIHJlbW92ZSwgYWZ0ZXIpIHtcbiAgICAgIHJldHVybiBiZWZvcmUgKyBhZnRlcjtcbiAgICB9KVxufVxuXG52YXIgZ28gPSBtb2R1bGUuZXhwb3J0cyA9IFxuXG4vKipcbiAqIEZpbHRlcnMgaW50ZXJuYWwgZnVuY3Rpb25zIGZyb20gdGhlIGdpdmVuIGNvbGxhcHNlZCBzdGFjay5cbiAqXG4gKiBOT1RFOiBubyBhY3R1YWwgbGluZXMgYXJlIHJlbW92ZWQsIGluc3RlYWQgdGhleSBhcmUgbW9kaWZpZWQgdG8gcmVtb3ZlIHRoZSBpbnRlcm5hbCBmdW5jdGlvbnMuXG4gKiBcbiAqIEBuYW1lIGZpbHRlckludGVybmFsc1xuICogQHByaXZhdGVcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gY29sbGFwc2VkIGNhbGxncmFwaCBkYXRhIHRoYXQgaGFzIGJlZW4gY29sbGFwc2VkXG4gKiBAcmV0dXJuIHtBcnJheS48U3RyaW5nPn0gY29sbGFwc2VkIGNhbGxncmFwaCBkYXRhIHdpdGggaW50ZXJuYWwgZnVuY3Rpb25zIHJlbW92ZWRcbiAqL1xuZnVuY3Rpb24gZmlsdGVySW50ZXJuYWxzKGNvbGxhcHNlZCkge1xuICByZXR1cm4gY29sbGFwc2VkLm1hcChmaWx0ZXJMaW5lKTsgIFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdjhMYXp5Q29tcGlsZVJlZ2V4ID0gL0xhenlDb21waWxlOi9nXG52YXIgdjhMYXp5Q29tcGlsZUlubGluZUluZm9SZWdleCA9IC9MYXp5Q29tcGlsZTpbfipdezAsMX0vZ1xuXG52YXIgZ28gPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZpbHRlckxhenlDb21waWxlKGNvbGxhcHNlZCwgb3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgdmFyIHY4TGF6eVJlZ2V4ID0gb3B0cy5vcHRpbWl6YXRpb25pbmZvID8gdjhMYXp5Q29tcGlsZVJlZ2V4IDogdjhMYXp5Q29tcGlsZUlubGluZUluZm9SZWdleDtcbiAgdmFyIHY4TGF6eVJlcGxhY2VtZW50ID0gb3B0cy5vcHRpbWl6YXRpb25pbmZvID8gJycgOiAnLSc7XG5cbiAgZnVuY3Rpb24gZmlsdGVyTGluZShsKSB7XG4gICAgcmV0dXJuIGwucmVwbGFjZSh2OExhenlSZWdleCwgdjhMYXp5UmVwbGFjZW1lbnQpXG4gIH1cblxuICByZXR1cm4gY29sbGFwc2VkLm1hcChmaWx0ZXJMaW5lKTsgIFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5zdHJ1bWVudHMgPSByZXF1aXJlKCcuL2NvbGxhcHNlLWluc3RydW1lbnRzJylcbiAgLCBwZXJmID0gcmVxdWlyZSgnLi9jb2xsYXBzZS1wZXJmJylcblxuZnVuY3Rpb24gZ2V0Q29sbGFwc2VyKHR5cGUpIHtcbiAgc3dpdGNoKHR5cGUpIHtcbiAgICBjYXNlICdpbnN0cnVtZW50cyc6XG4gICAgICByZXR1cm4gaW5zdHJ1bWVudHMoKVxuICAgIGNhc2UgJ3BlcmYnOlxuICAgICAgcmV0dXJuIHBlcmYoKVxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gdHlwZSwgY2Fubm90IGNvbGxhcHNlIFwiJyArIHR5cGUgKyAnXCInKTsgXG4gIH1cbn1cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXG5cbi8qKlxuICogQ29sbGFwc2VzIGEgY2FsbGdyYXBoIGluc2lkZSBhIGdpdmVuIGxpbmVzIGFycmF5IGxpbmUgYnkgbGluZS5cbiAqIFxuICogQG5hbWUgZmxhbWVncmFwaDo6c3RhY2tDb2xsYXBzZS5hcnJheVxuICogQHByaXZhdGVcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgdGhlIHR5cGUgb2YgaW5wdXQgdG8gY29sbGFwc2VcbiAqIEBwYXJhbSB7QXJyYXkuPHN0cmluZz59IGFyciBsaW5lcyB0byBjb2xsYXBzZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59IGFycmF5IG9mIGNvbGxhcHNlZCBsaW5lc1xuICovXG5mdW5jdGlvbiBzdGFja0NvbGxhcHNlKHR5cGUsIGFycikge1xuICB2YXIgY29sbGFwc2VyID0gZ2V0Q29sbGFwc2VyKHR5cGUpO1xuXG4gIGZ1bmN0aW9uIG9ubGluZSAobGluZSkge1xuICAgIGNvbGxhcHNlci5jb2xsYXBzZUxpbmUobGluZSk7XG4gIH1cblxuICBmdW5jdGlvbiBub25FbXB0eShsaW5lKSB7XG4gICAgcmV0dXJuIGxpbmUgJiYgbGluZS5sZW5ndGg7XG4gIH1cblxuICBhcnIuZm9yRWFjaChvbmxpbmUpO1xuXG4gIHJldHVybiBjb2xsYXBzZXIuY29sbGFwc2VkTGluZXMoKS5maWx0ZXIobm9uRW1wdHkpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVnZXhwID0gL14oLiopXFxzKyhcXGQrKD86XFwuXFxkKik/KSQvO1xuXG5mdW5jdGlvbiBsZXhpY2FsbHkoYSwgYikge1xuICByZXR1cm4gIGEgPCBiID8gLTEgXG4gICAgICAgIDogYiA8IGEgPyAgMSA6IDA7XG59XG5cbmZ1bmN0aW9uIHNvcnQoZnVuY3Rpb25zKSB7XG4gIHJldHVybiBmdW5jdGlvbnMuc29ydChsZXhpY2FsbHkpO1xufVxuXG5mdW5jdGlvbiBmbG93KHRtcCwgbm9kZXMsIGxhc3QsIGZyYW1lcywgdGltZSkge1xuXG4gIHZhciBsZW5MYXN0ID0gbGFzdC5sZW5ndGggLSAxXG4gICAgLCBsZW5GcmFtZXMgPSBmcmFtZXMubGVuZ3RoIC0gMVxuICAgICwgaVxuICAgICwgbGVuU2FtZVxuICAgICwga1xuXG4gIGZvcihpID0gMDsgaSA8PSBsZW5MYXN0OyBpKyspIHtcbiAgICBpZiAoaSA+IGxlbkZyYW1lcykgYnJlYWs7XG4gICAgaWYgKGxhc3RbaV0gIT09IGZyYW1lc1tpXSkgYnJlYWs7XG4gIH1cbiAgbGVuU2FtZSA9IGk7XG5cbiAgZm9yKGkgPSBsZW5MYXN0OyBpID49IGxlblNhbWU7IGktLSkge1xuICAgIGsgPSBsYXN0W2ldICsgJzsnICsgaTtcblx0XHQvLyBhIHVuaXF1ZSBJRCBpcyBjb25zdHJ1Y3RlZCBmcm9tIFwiZnVuYztkZXB0aDtldGltZVwiO1xuXHRcdC8vIGZ1bmMtZGVwdGggaXNuJ3QgdW5pcXVlLCBpdCBtYXkgYmUgcmVwZWF0ZWQgbGF0ZXIuXG4gICAgbm9kZXNbayArICc7JyArIHRpbWVdID0geyBmdW5jOiBsYXN0W2ldLCBkZXB0aDogaSwgZXRpbWU6IHRpbWUsIHN0aW1lOiB0bXBba10uc3RpbWUgfVxuICAgIHRtcFtrXSA9IG51bGw7XG4gIH1cblxuICBmb3IoaSA9IGxlblNhbWU7IGkgPD0gbGVuRnJhbWVzOyBpKyspIHtcbiAgICBrID0gZnJhbWVzW2ldKyAnOycgKyBpO1xuICAgIHRtcFtrXSA9IHsgc3RpbWU6IHRpbWUgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cmltTGluZShsaW5lKSB7XG4gIHJldHVybiBsaW5lLnRyaW0oKTtcbn1cblxuZnVuY3Rpb24gbm9uZW1wdHkobGluZSkge1xuICByZXR1cm4gbGluZS5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gXG5cbi8qKlxuICogUGFyc2VzIGNvbGxhcHNlZCBsaW5lcyBpbnRvIGEgbm9kZXMgYXJyYXkuXG4gKiBcbiAqIEBuYW1lIHBhcnNlSW5wdXRcbiAqIEBwcml2YXRlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXkuPHN0cmluZz59IGxpbmVzIGNvbGxhcHNlZCBjYWxsZ3JhcGhcbiAqIEByZXR1cm4ge09iamVjdH0gIFxuICogIC0gbm9kZXM6IGFycmF5IG9mIG5vZGVzLCBvbmUgZm9yIGVhY2ggbGluZSBcbiAqICAtIHRpbWU6IHRvdGFsIGV4ZWN1dGlvbiB0aW1lXG4gKiAgLSBpZ25vcmVkOiBob3cgbWFueSBsaW5lcyB3aGVyZSBpZ25vcmVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSW5wdXQobGluZXMpIHtcbiAgdmFyIGlnbm9yZWQgPSAwXG4gICAgLCB0aW1lID0gMFxuICAgICwgbGFzdCA9IFtdXG4gICAgLCB0bXAgPSB7fVxuICAgICwgbm9kZXMgPSB7fVxuICAgIDtcblxuICBmdW5jdGlvbiBwcm9jZXNzTGluZShsaW5lKSB7XG4gICAgdmFyIGZyYW1lcztcblxuICAgIHZhciBtYXRjaGVzID0gbGluZS5tYXRjaChyZWdleHApO1xuICAgIGlmICghbWF0Y2hlcyB8fCAhbWF0Y2hlcy5sZW5ndGgpIHJldHVybjtcblxuICAgIHZhciBzdGFjayAgID0gbWF0Y2hlc1sxXTtcbiAgICB2YXIgc2FtcGxlcyA9IG1hdGNoZXNbMl07XG5cbiAgICBpZiAoIXNhbXBsZXMpIHtcbiAgICAgIGlnbm9yZWQrKztcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzdGFjayA9IHN0YWNrLnJlcGxhY2UoLzw+L2csICcoKScpO1xuICAgIGZyYW1lcyA9IHN0YWNrLnNwbGl0KCc7Jyk7XG5cbiAgICBmbG93KHRtcCwgbm9kZXMsIGxhc3QsIGZyYW1lcywgdGltZSk7XG4gICAgdGltZSArPSBwYXJzZUludChzYW1wbGVzLCAxMCk7XG5cbiAgICBsYXN0ID0gZnJhbWVzO1xuICB9XG5cbiAgc29ydChcbiAgICBsaW5lc1xuICAgICAgLm1hcCh0cmltTGluZSlcbiAgICAgIC5maWx0ZXIobm9uZW1wdHkpXG4gICAgKVxuICAgIC5mb3JFYWNoKHByb2Nlc3NMaW5lKTtcblxuICBmbG93KHRtcCwgbm9kZXMsIGxhc3QsIFtdLCB0aW1lKTtcblxuICBpZiAoaWdub3JlZCkgY29uc29sZS5lcnJvcignSWdub3JlZCAlZCBsaW5lcyB3aXRoIGludmFsaWQgZm9ybWF0Jyk7XG4gIGlmICghdGltZSkgdGhyb3cgbmV3IEVycm9yKCdObyBzdGFjayBjb3VudHMgZm91bmQhJyk7XG5cbiAgcmV0dXJuIHsgbm9kZXM6IG5vZGVzLCB0aW1lOiB0aW1lLCBpZ25vcmVkOiBpZ25vcmVkIH07XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gcmVzb2x2ZWQgdmlhIGhic2Z5IHRyYW5zZm9ybVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3ZnLmhicycpO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEsZGVwdGhzKSB7XG4gIHZhciBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBidWZmZXIgPSBcIjxnIGNsYXNzPVxcXCJmdW5jX2dcXFwiIG9ubW91c2VvdmVyPVxcXCJzKCdcIjtcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnNhbXBsZXMgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNhbXBsZXMgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic2FtcGxlc1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCInKVxcXCIgb25tb3VzZW91dD1cXFwiYygpXFxcIiBkYXRhLXNlYXJjaD1cXFwiXCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuc2VhcmNoIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zZWFyY2ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic2VhcmNoXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuPHRpdGxlPlwiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwibmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuc2FtcGxlcyB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc2FtcGxlcyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJzYW1wbGVzXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvdGl0bGU+XFxuICA8cmVjdCB4PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJlY3RfeCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmVjdF94IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInJlY3RfeFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF95IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X3kgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF95XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgd2lkdGg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF93IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X3cgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF93XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZGF0YS13aWR0aD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWN0X3cgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJlY3RfdyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJyZWN0X3dcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBoZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF9oIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X2ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF9oXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZGF0YS1oZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF9oIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X2ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF9oXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWN0X2ZpbGwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJlY3RfZmlsbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJyZWN0X2ZpbGxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiByeD1cXFwiMlxcXCIgcnk9XFxcIjJcXFwiIC8+XFxuXFxuXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zaG93VGV4dCA6IGRlcHRoMCksIHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgyLCBkYXRhLCBkZXB0aHMpLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIHJldHVybiBidWZmZXIgKyBcIlxcbjwvZz5cXG5cIjtcbn0sXCIyXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSxkZXB0aHMpIHtcbiAgdmFyIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGxhbWJkYT10aGlzLmxhbWJkYSwgYnVmZmVyID0gXCI8dGV4dCB0ZXh0LWFuY2hvcj1cXFwiXFxcIiB4PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnRleHRfeCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGV4dF94IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRleHRfeFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGV4dF95IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50ZXh0X3kgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidGV4dF95XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZm9udC1zaXplPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbihsYW1iZGEoKGRlcHRoc1syXSAhPSBudWxsID8gZGVwdGhzWzJdLmZvbnRzaXplIDogZGVwdGhzWzJdKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIiBmb250LWZhbWlseT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24obGFtYmRhKChkZXB0aHNbMl0gIT0gbnVsbCA/IGRlcHRoc1syXS5mb250dHlwZSA6IGRlcHRoc1syXSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwicmdiKDAsMCwwKVxcXCI+XCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGV4dCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGV4dCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ0ZXh0XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIHJldHVybiBidWZmZXIgKyBcIjwvdGV4dD5cXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEsZGVwdGhzKSB7XG4gIHZhciBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBidWZmZXIgPSBcIjw/eG1sIHZlcnNpb249XFxcIjEuMFxcXCIgc3RhbmRhbG9uZT1cXFwibm9cXFwiPz5cXG48IURPQ1RZUEUgc3ZnIFBVQkxJQyBcXFwiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU5cXFwiIFxcXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcXFwiPlxcbjxzdmcgdmVyc2lvbj1cXFwiMS4xXFxcIiB3aWR0aD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWFnZXdpZHRoIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbWFnZXdpZHRoIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImltYWdld2lkdGhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBoZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2VoZWlnaHQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdlaGVpZ2h0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImltYWdlaGVpZ2h0XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgb25sb2FkPVxcXCJpbml0KGV2dClcXFwiIHZpZXdCb3g9XFxcIjAgMCBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltYWdld2lkdGggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdld2lkdGggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2V3aWR0aFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCIgXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWFnZWhlaWdodCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2VoZWlnaHQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2VoZWlnaHRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG48ZGVmcz5cXG5cdDxsaW5lYXJHcmFkaWVudCBpZD1cXFwiYmFja2dyb3VuZFxcXCIgeTE9XFxcIjBcXFwiIHkyPVxcXCIxXFxcIiB4MT1cXFwiMFxcXCIgeDI9XFxcIjBcXFwiPlxcbiAgICA8c3RvcCBzdG9wLWNvbG9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmJnY29sb3IxIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5iZ2NvbG9yMSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJiZ2NvbG9yMVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG9mZnNldD1cXFwiNSVcXFwiIC8+XFxuICAgIDxzdG9wIHN0b3AtY29sb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuYmdjb2xvcjIgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmJnY29sb3IyIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImJnY29sb3IyXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgb2Zmc2V0PVxcXCI5NSVcXFwiIC8+XFxuXHQ8L2xpbmVhckdyYWRpZW50PlxcbjwvZGVmcz5cXG48c3R5bGUgdHlwZT1cXFwidGV4dC9jc3NcXFwiPlxcblx0LmZ1bmNfZzpob3ZlciB7IHN0cm9rZTpibGFjazsgc3Ryb2tlLXdpZHRoOjAuNTsgfVxcbjwvc3R5bGU+XFxuPHNjcmlwdCB0eXBlPVxcXCJ0ZXh0L2phdmFzY3JpcHRcXFwiPlxcblx0dmFyIGRldGFpbHM7XFxuXHRmdW5jdGlvbiBpbml0KGV2dCkgeyBkZXRhaWxzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXFxcImRldGFpbHNcXFwiKS5maXJzdENoaWxkOyB9XFxuICBmdW5jdGlvbiBzKGluZm8pIHsgZGV0YWlscy5ub2RlVmFsdWUgPSBcXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1ldHlwZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZXR5cGUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwibmFtZXR5cGVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiOiBcXFwiICsgaW5mbzsgfVxcblx0ZnVuY3Rpb24gYygpIHsgZGV0YWlscy5ub2RlVmFsdWUgPSAnICc7IH1cXG48L3NjcmlwdD5cXG5cXG48cmVjdCB4PVxcXCIwLjBcXFwiIHk9XFxcIjBcXFwiIHdpZHRoPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltYWdld2lkdGggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdld2lkdGggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2V3aWR0aFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGhlaWdodD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWFnZWhlaWdodCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2VoZWlnaHQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2VoZWlnaHRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBmaWxsPVxcXCJ1cmwoI2JhY2tncm91bmQpXFxcIiAgLz5cXG48dGV4dCB0ZXh0LWFuY2hvcj1cXFwibWlkZGxlXFxcIiB4PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnRpdGxlWCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGl0bGVYIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRpdGxlWFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHk9XFxcIjI0XFxcIiBmb250LXNpemU9XFxcIjE3XFxcIiBmb250LWZhbWlseT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5mb250dHlwZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZm9udHR5cGUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiZm9udHR5cGVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBmaWxsPVxcXCJyZ2IoMCwwLDApXFxcIj5cIjtcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50aXRsZXRleHQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRpdGxldGV4dCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ0aXRsZXRleHRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC90ZXh0Plxcbjx0ZXh0IHRleHQtYW5jaG9yPVxcXCJsZWZ0XFxcIiB4PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnhwYWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnhwYWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwieHBhZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGV0YWlsc1kgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRldGFpbHNZIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImRldGFpbHNZXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZm9udC1zaXplPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZvbnRzaXplIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mb250c2l6ZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJmb250c2l6ZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGZvbnQtZmFtaWx5PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZvbnR0eXBlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mb250dHlwZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJmb250dHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGZpbGw9XFxcInJnYigwLDAsMClcXFwiIGlkPVxcXCJkZXRhaWxzXFxcIj4gPC90ZXh0PlxcblxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5ub2RlcyA6IGRlcHRoMCksIHtcIm5hbWVcIjpcImVhY2hcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIGRlcHRocyksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgcmV0dXJuIGJ1ZmZlciArIFwiXFxuPC9zdmc+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWUsXCJ1c2VEZXB0aHNcIjp0cnVlfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB4dGVuZCAgICAgICAgICAgPSByZXF1aXJlKCd4dGVuZCcpXG4gICwgcGFyc2VJbnB1dCAgICAgID0gcmVxdWlyZSgnLi9zdGFja3BhcnNlJylcbiAgLCBjb250ZXh0aWZ5ICAgICAgPSByZXF1aXJlKCcuL2NvbnRleHRpZnknKVxuICAsIHN2Z1RlbXBsYXRlICAgICA9IHJlcXVpcmUoJy4vc3ZnLXRlbXBsYXRlJylcbiAgLCBkZWZhdWx0T3B0cyAgICAgPSByZXF1aXJlKCcuL2RlZmF1bHQtb3B0cycpXG5cbnZhciBnbyA9IG1vZHVsZS5leHBvcnRzID0gXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbnRleHQgZnJvbSBhIGNhbGwgZ3JhcGggdGhhdCBoYXMgYmVlbiBjb2xsYXBzZWQgKGBzdGFja2NvbGxhcHNlLSpgKSBhbmQgcmVuZGVycyBzdmcgZnJvbSBpdC5cbiAqIFxuICogQG5hbWUgZmxhbWVncmFwaDo6c3ZnIFxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0FycmF5LjxzdHJpbmc+fSBjb2xsYXBzZWRMaW5lcyBjYWxsZ3JhcGggdGhhdCBoYXMgYmVlbiBjb2xsYXBzZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIG9wdGlvbnNcbiAqIEByZXR1cm4ge3N0cmluZ30gc3ZnIFxuICovXG5mdW5jdGlvbiBzdmcoY29sbGFwc2VkTGluZXMsIG9wdHMpIHtcbiAgb3B0cyA9IHh0ZW5kKGRlZmF1bHRPcHRzLCBvcHRzKTtcblxuICB2YXIgcGFyc2VkID0gcGFyc2VJbnB1dChjb2xsYXBzZWRMaW5lcylcbiAgdmFyIGNvbnRleHQgPSBjb250ZXh0aWZ5KHBhcnNlZCwgb3B0cylcblxuICByZXR1cm4gc3ZnVGVtcGxhdGUoY29udGV4dCk7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIG5vdyA9IHJlcXVpcmUoJ2RhdGUtbm93Jyk7XG5cbi8qKlxuICogUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICogYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICogTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gKiBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICpcbiAqIEBzb3VyY2UgdW5kZXJzY29yZS5qc1xuICogQHNlZSBodHRwOi8vdW5zY3JpcHRhYmxlLmNvbS8yMDA5LzAzLzIwL2RlYm91bmNpbmctamF2YXNjcmlwdC1tZXRob2RzL1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gdG8gd3JhcFxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVvdXQgaW4gbXMgKGAxMDBgKVxuICogQHBhcmFtIHtCb29sZWFufSB3aGV0aGVyIHRvIGV4ZWN1dGUgYXQgdGhlIGJlZ2lubmluZyAoYGZhbHNlYClcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBpbW1lZGlhdGUpe1xuICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG4gIGlmIChudWxsID09IHdhaXQpIHdhaXQgPSAxMDA7XG5cbiAgZnVuY3Rpb24gbGF0ZXIoKSB7XG4gICAgdmFyIGxhc3QgPSBub3coKSAtIHRpbWVzdGFtcDtcblxuICAgIGlmIChsYXN0IDwgd2FpdCAmJiBsYXN0ID4gMCkge1xuICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICBpZiAoIWltbWVkaWF0ZSkge1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpZiAoIXRpbWVvdXQpIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGRlYm91bmNlZCgpIHtcbiAgICBjb250ZXh0ID0gdGhpcztcbiAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHRpbWVzdGFtcCA9IG5vdygpO1xuICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgIGlmICghdGltZW91dCkgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgIGlmIChjYWxsTm93KSB7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBEYXRlLm5vdyB8fCBub3dcblxuZnVuY3Rpb24gbm93KCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmdsb2JhbHMgSGFuZGxlYmFyczogdHJ1ZSAqL1xudmFyIGJhc2UgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2Jhc2VcIik7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvdXRpbHNcIik7XG52YXIgcnVudGltZSA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvcnVudGltZVwiKTtcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG52YXIgY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xuICB9O1xuXG4gIHJldHVybiBoYjtcbn07XG5cbnZhciBIYW5kbGViYXJzID0gY3JlYXRlKCk7XG5IYW5kbGViYXJzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuSGFuZGxlYmFyc1snZGVmYXVsdCddID0gSGFuZGxlYmFycztcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBIYW5kbGViYXJzOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIFZFUlNJT04gPSBcIjIuMC4wXCI7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO3ZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDY7XG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMSdcbn07XG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O0hhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgcGFydGlhbCkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gcGFydGlhbDtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMucGFydGlhbHNbbmFtZV07XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbigvKiBbYXJncywgXW9wdGlvbnMgKi8pIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBBIG1pc3NpbmcgZmllbGQgaW4gYSB7e2Zvb319IGNvbnN0dWN0LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU29tZW9uZSBpcyBhY3R1YWxseSB0cnlpbmcgdG8gY2FsbCBzb21ldGhpbmcsIGJsb3cgdXAuXG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoLTFdLm5hbWUgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7ZGF0YTogZGF0YX07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgICB2YXIgY29udGV4dFBhdGg7XG4gICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKSArICcuJztcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIGRhdGEubGFzdCAgPSAoaSA9PT0gKGNvbnRleHQubGVuZ3RoLTEpKTtcblxuICAgICAgICAgICAgaWYgKGNvbnRleHRQYXRoKSB7XG4gICAgICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgICAgICBkYXRhLmtleSA9IGtleTtcbiAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG5cbiAgICAgICAgICAgICAgaWYgKGNvbnRleHRQYXRoKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsga2V5O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaSA9PT0gMCl7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsKSB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNofSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XG4gICAgICAgIG9wdGlvbnMgPSB7ZGF0YTpkYXRhfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBtZXNzYWdlKTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uKG9iaiwgZmllbGQpIHtcbiAgICByZXR1cm4gb2JqICYmIG9ialtmaWVsZF07XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDMsXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgbWVzc2FnZSkge1xuICAgIGlmIChsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xudmFyIGxvZyA9IGxvZ2dlci5sb2c7XG5leHBvcnRzLmxvZyA9IGxvZztcbnZhciBjcmVhdGVGcmFtZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICB2YXIgZnJhbWUgPSBVdGlscy5leHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn07XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxpbmU7XG4gIGlmIChub2RlICYmIG5vZGUuZmlyc3RMaW5lKSB7XG4gICAgbGluZSA9IG5vZGUuZmlyc3RMaW5lO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChsaW5lKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEV4Y2VwdGlvbjsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi9iYXNlXCIpLkNPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSByZXF1aXJlKFwiLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG52YXIgY3JlYXRlRnJhbWUgPSByZXF1aXJlKFwiLi9iYXNlXCIpLmNyZWF0ZUZyYW1lO1xuXG5mdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5jaGVja1JldmlzaW9uID0gY2hlY2tSZXZpc2lvbjsvLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGVcIik7XG4gIH1cbiAgaWYgKCF0ZW1wbGF0ZVNwZWMgfHwgIXRlbXBsYXRlU3BlYy5tYWluKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVW5rbm93biB0ZW1wbGF0ZSBvYmplY3Q6ICcgKyB0eXBlb2YgdGVtcGxhdGVTcGVjKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgaW5kZW50LCBuYW1lLCBjb250ZXh0LCBoYXNoLCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSwgZGVwdGhzKSB7XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIGNvbnRleHQgPSBVdGlscy5leHRlbmQoe30sIGNvbnRleHQsIGhhc2gpO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhLCBkZXB0aHMpO1xuXG4gICAgaWYgKHJlc3VsdCA9PSBudWxsICYmIGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhLCBkZXB0aHM6IGRlcHRocyB9O1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB7IGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCwgY29tcGF0OiB0ZW1wbGF0ZVNwZWMuY29tcGF0IH0sIGVudik7XG4gICAgICByZXN1bHQgPSBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICBpZiAoaW5kZW50KSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHJlc3VsdC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGluZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFsaW5lc1tpXSAmJiBpICsgMSA9PT0gbCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGluZXNbaV0gPSBpbmRlbnQgKyBsaW5lc1tpXTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGxvb2t1cDogZnVuY3Rpb24oZGVwdGhzLCBuYW1lKSB7XG4gICAgICB2YXIgbGVuID0gZGVwdGhzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGRlcHRoc1tpXSAmJiBkZXB0aHNbaV1bbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBkZXB0aHNbaV1bbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGxhbWJkYTogZnVuY3Rpb24oY3VycmVudCwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBjdXJyZW50ID09PSAnZnVuY3Rpb24nID8gY3VycmVudC5jYWxsKGNvbnRleHQpIDogY3VycmVudDtcbiAgICB9LFxuXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgIGZuOiBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjW2ldO1xuICAgIH0sXG5cbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZGF0YSwgZGVwdGhzKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxuICAgICAgICAgIGZuID0gdGhpcy5mbihpKTtcbiAgICAgIGlmIChkYXRhIHx8IGRlcHRocykge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0odGhpcywgaSwgZm4sIGRhdGEsIGRlcHRocyk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBwcm9ncmFtKHRoaXMsIGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuXG4gICAgZGF0YTogZnVuY3Rpb24oZGF0YSwgZGVwdGgpIHtcbiAgICAgIHdoaWxlIChkYXRhICYmIGRlcHRoLS0pIHtcbiAgICAgICAgZGF0YSA9IGRhdGEuX3BhcmVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIHJldCA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogdGVtcGxhdGVTcGVjLmNvbXBpbGVyXG4gIH07XG5cbiAgdmFyIHJldCA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgIHJldC5fc2V0dXAob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwgJiYgdGVtcGxhdGVTcGVjLnVzZURhdGEpIHtcbiAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICB9XG4gICAgdmFyIGRlcHRocztcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocykge1xuICAgICAgZGVwdGhzID0gb3B0aW9ucy5kZXB0aHMgPyBbY29udGV4dF0uY29uY2F0KG9wdGlvbnMuZGVwdGhzKSA6IFtjb250ZXh0XTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGRlcHRocyk7XG4gIH07XG4gIHJldC5pc1RvcCA9IHRydWU7XG5cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5oZWxwZXJzLCBlbnYuaGVscGVycyk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgfTtcblxuICByZXQuX2NoaWxkID0gZnVuY3Rpb24oaSwgZGF0YSwgZGVwdGhzKSB7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvZ3JhbShjb250YWluZXIsIGksIHRlbXBsYXRlU3BlY1tpXSwgZGF0YSwgZGVwdGhzKTtcbiAgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVwdGhzKSB7XG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEgfHwgZGF0YSwgZGVwdGhzICYmIFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSwgZGVwdGhzKSB7XG4gIHZhciBvcHRpb25zID0geyBwYXJ0aWFsOiB0cnVlLCBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEsIGRlcHRoczogZGVwdGhzIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDtmdW5jdGlvbiBpbml0RGF0YShjb250ZXh0LCBkYXRhKSB7XG4gIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xuICAgIGRhdGEgPSBkYXRhID8gY3JlYXRlRnJhbWUoZGF0YSkgOiB7fTtcbiAgICBkYXRhLnJvb3QgPSBjb250ZXh0O1xuICB9XG4gIHJldHVybiBkYXRhO1xufSIsIlwidXNlIHN0cmljdFwiO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJcIiArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBTYWZlU3RyaW5nOyIsIlwidXNlIHN0cmljdFwiO1xuLypqc2hpbnQgLVcwMDQgKi9cbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZShcIi4vc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqIC8qICwgLi4uc291cmNlICovKSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDt2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9IGVsc2UgaWYgKCFzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gIH1cblxuICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICBzdHJpbmcgPSBcIlwiICsgc3RyaW5nO1xuXG4gIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO2Z1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5O2Z1bmN0aW9uIGFwcGVuZENvbnRleHRQYXRoKGNvbnRleHRQYXRoLCBpZCkge1xuICByZXR1cm4gKGNvbnRleHRQYXRoID8gY29udGV4dFBhdGggKyAnLicgOiAnJykgKyBpZDtcbn1cblxuZXhwb3J0cy5hcHBlbmRDb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoOyIsIi8vIENyZWF0ZSBhIHNpbXBsZSBwYXRoIGFsaWFzIHRvIGFsbG93IGJyb3dzZXJpZnkgdG8gcmVzb2x2ZVxuLy8gdGhlIHJ1bnRpbWUgb24gYSBzdXBwb3J0ZWQgcGF0aC5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKVtcImRlZmF1bHRcIl07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgaGV4QWRkcmVzc1JlZ2V4ID0gLzB4KChcXGR8W2FiY2RlZkFCQ0RFRl0pezAsMn0pKy87XG5cbmZ1bmN0aW9uIGJ5RGVjaW1hbEFkZHJlc3MoYSwgYikge1xuICByZXR1cm4gYS5kZWNpbWFsQWRkcmVzcyA8IGIuZGVjaW1hbEFkZHJlc3MgPyAtMSA6IDE7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NMaW5lKGFjYywgeCkge1xuICBpZiAoIXgudHJpbSgpLmxlbmd0aCkgcmV0dXJuIGFjYztcblxuICB2YXIgcGFydHMgPSB4LnNwbGl0KC8gKy8pO1xuICBpZiAocGFydHMubGVuZ3RoIDwgMykgcmV0dXJuIGFjYztcblxuICB2YXIgZGVjaW1hbCA9IHBhcnNlSW50KHBhcnRzWzBdLCAxNilcblxuICB2YXIgaXRlbSA9IHsgXG4gICAgICBhZGRyZXNzICAgICAgICA6IHBhcnRzWzBdXG4gICAgLCBzaXplICAgICAgICAgICA6IHBhcnRzWzFdXG4gICAgLCBkZWNpbWFsQWRkcmVzcyA6IGRlY2ltYWxcbiAgICAsIHN5bWJvbCAgICAgICAgIDogcGFydHMuc2xpY2UoMikuam9pbignICcpIH1cblxuICBhY2MucHVzaChpdGVtKTtcbiAgcmV0dXJuIGFjYztcbn1cblxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgYSBKSVQgcmVzb2x2ZXIgZm9yIHRoZSBnaXZlbiBtYXAuXG4gKiBcbiAqIEBuYW1lIEpJVFJlc29sdmVyXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5LjxTdHJpbmc+fSBtYXAgZWl0aGVyIGEgc3RyaW5nIG9yIGxpbmVzIHdpdGggc3BhY2Ugc2VwYXJhdGVkIEhleEFkZHJlc3MsIFNpemUsIFN5bWJvbCBvbiBlYWNoIGxpbmVcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIGluaXRpYWxpemVkIEpJVCByZXNvbHZlclxuICovXG5mdW5jdGlvbiBKSVRSZXNvbHZlcihtYXApIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEpJVFJlc29sdmVyKSkgcmV0dXJuIG5ldyBKSVRSZXNvbHZlcihtYXApO1xuICBcbiAgdmFyIGxpbmVzID0gQXJyYXkuaXNBcnJheShtYXApID8gbWFwIDogbWFwLnNwbGl0KCdcXG4nKVxuICB0aGlzLl9hZGRyZXNzZXMgPSBsaW5lc1xuICAgIC5yZWR1Y2UocHJvY2Vzc0xpbmUsIFtdKVxuICAgIC5zb3J0KGJ5RGVjaW1hbEFkZHJlc3MpXG5cbiAgdGhpcy5fbGVuID0gdGhpcy5fYWRkcmVzc2VzLmxlbmd0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBKSVRSZXNvbHZlcjtcblxudmFyIHByb3RvID0gSklUUmVzb2x2ZXIucHJvdG90eXBlO1xuXG4vKipcbiAqIE1hdGNoZXMgdGhlIGFkZHJlc3Mgb2YgdGhlIHN5bWJvbCBvZiB3aGljaCB0aGUgZ2l2ZW4gYWRkcmVzcyBpcyBwYXJ0IG9mLlxuICogXG4gKlxuICogQG5hbWUgSklUUmVzb2x2ZXI6OnJlc29sdmVcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBoZXhBZGRyZXNzIHRoZSBoZXhhZGVjaW1hbCBhZGRyZXNzIG9mIHRoZSBhZGRyZXNzIHRvIGNoZWNrXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluZm8gb2YgdGhlIG1hdGNoaW5nIHN5bWJvbCB3aGljaCBpbmNsdWRlcyBhZGRyZXNzLCBzaXplLCBzeW1ib2xcbiAqL1xucHJvdG8ucmVzb2x2ZSA9IGZ1bmN0aW9uIHJlc29sdmUoaGV4QWRkcmVzcykge1xuICB2YXIgbWF0Y2ggPSBudWxsO1xuICB2YXIgYSA9IHR5cGVvZiBoZXhBZGRyZXNzID09PSAnbnVtYmVyJyA/IGhleEFkZHJlc3MgOiBwYXJzZUludChoZXhBZGRyZXNzLCAxNik7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9sZW47IGkrKykge1xuICAgIC8vIG9uY2Ugd2UgaGl0IGEgbGFyZ2VyIGFkZHJlc3MgdGhhdCBtZWFucyBvdXIgc3ltYm9sL2Z1bmN0aW9uIHRoYXQgdGhpc1xuICAgIC8vIGFkZHJlc3MgaXMgcGFydCBvZiBzdGFydHMgYXQgdGhlIHByZXZpb3VzIGFkZHJlc3NcbiAgICBpZihhIDwgdGhpcy5fYWRkcmVzc2VzW2ldLmRlY2ltYWxBZGRyZXNzKSB7IFxuICAgICAgbWF0Y2ggPSB0aGlzLl9hZGRyZXNzZXNbaSAtIDFdO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdEdldEhleEFkZHJlc3MobGluZSkge1xuICB2YXIgbSA9IGxpbmUubWF0Y2goaGV4QWRkcmVzc1JlZ2V4KTtcbiAgcmV0dXJuIG0gJiYgbVswXTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyBhbGwgc3ltYm9scyBpbiBhIGdpdmVuIHN0YWNrIGFuZCByZXBsYWNlcyB0aGVtIGFjY29yZGluZ2x5XG4gKiBcbiAqIEBuYW1lIEpJVFJlc29sdmVyOjpyZXNvbHZlTXVsdGlcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtBcnJheS48U3RyaW5nPnxTdHJpbmd9IHN0YWNrIHN0cmluZyBvZiBzdGFjayBvciBsaW5lcyBvZiBzdGFja1xuICogQHBhcmFtIHtmdW5jdGlvbj19IGdldEhleEFkZHJlc3MgYWxsb3dzIG92ZXJyaWRpbmcgdGhlIGZ1bmN0aW9uIHVzZWQgdG8gZmluZCBhIGhleCBhZGRyZXNzIG9uIGVhY2ggbGluZVxuICogQHJldHVybiB7QXJyYXkuPFN0cmluZz58U3RyaW5nfSB0aGUgc3RhY2sgd2l0aCBzeW1ib2xzIHJlc29sdmVkIGluIHRoZSBzYW1lIGZvcm1hdCB0aGF0IHRoZSBzdGFjayB3YXMgZ2l2ZW4sIGVpdGhlciBhcyBsaW5lcyBvciBvbmUgc3RyaW5nXG4gKi9cbnByb3RvLnJlc29sdmVNdWx0aSA9IGZ1bmN0aW9uIHJlc29sdmVNdWx0aShzdGFjaywgZ2V0SGV4QWRkcmVzcykge1xuICBnZXRIZXhBZGRyZXNzID0gZ2V0SGV4QWRkcmVzcyB8fCBkZWZhdWx0R2V0SGV4QWRkcmVzcztcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBpc0xpbmVzID0gQXJyYXkuaXNBcnJheShzdGFjaylcbiAgdmFyIGxpbmVzID0gaXNMaW5lcyA/IHN0YWNrIDogc3RhY2suc3BsaXQoJ1xcbicpXG5cbiAgZnVuY3Rpb24gcHJvY2Vzc0xpbmUobGluZSkge1xuICAgIHZhciBhZGRyZXNzID0gZ2V0SGV4QWRkcmVzcyhsaW5lKTtcbiAgICBpZiAoIWFkZHJlc3MpIHJldHVybiBsaW5lO1xuXG4gICAgdmFyIHJlc29sdmVkID0gc2VsZi5yZXNvbHZlKGFkZHJlc3MpO1xuICAgIGlmICghcmVzb2x2ZWQpIHJldHVybiBsaW5lO1xuXG4gICAgcmV0dXJuIGxpbmUucmVwbGFjZShhZGRyZXNzLCByZXNvbHZlZC5zeW1ib2wpO1xuICB9XG4gIFxuICB2YXIgcHJvY2Vzc2VkTGluZXMgPSBsaW5lcy5tYXAocHJvY2Vzc0xpbmUpO1xuXG4gIHJldHVybiBpc0xpbmVzID8gcHJvY2Vzc2VkTGluZXMgOiBwcm9jZXNzZWRMaW5lcy5qb2luKCdcXG4nKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJ2RlYm91bmNlJylcblxudmFyIHNlYXJjaEZpZWxkRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2VhcmNoLnVpLXBhcnQgaW5wdXRbdHlwZT1zZWFyY2hdJylcbiAgLCByZWdleENoZWNrRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoLXJlZ2V4JylcbiAgLCBibGlua0NoZWNrRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoLWJsaW5rJylcbiAgLCBzZWFyY2hFcnJvckVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NlYXJjaC1lcnJvcicpXG5cbmZ1bmN0aW9uIHRyeU1ha2VSZWdleChxdWVyeSkge1xuICB0cnkge1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHF1ZXJ5LCAnaScpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlKTtcbiAgICBzZWFyY2hFcnJvckVsLnZhbHVlID0gZS5tZXNzYWdlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZE1hdGNoSW5kaWNhdG9yKGVsKSB7XG4gIGVsLmNsYXNzTGlzdC5hZGQoJ21hdGNoJyk7ICBcbiAgdmFyIHJlY3QgPSBlbC5jaGlsZHJlblsxXVxuICB2YXIgdyA9IHJlY3QuZ2V0QXR0cmlidXRlKCd3aWR0aCcpO1xuICB2YXIgaCA9IHJlY3QuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKTtcbiBcbiAgLy8gbWFrZSBpbnZpc2libGUgb3IgdG9vIHNtYWxsIG5vZGVzIHRoYXQgbWF0Y2hlZCB0aGUgc2VhcmNoIHZpc2libGVcbiAgLy8gaW5kaWNhdGUgdGhhdCB0aGV5IHdlcmUgbWFkZSB2aXNpYmxlIGJ5IG1ha2luZyB0aGVtIGhhbGYgYXMgaGlnaFxuICBpZiAodyA8IDEwKSB7XG4gICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgMTApO1xuICAgIHJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoIC8gMik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlTWF0Y2hJbmRpY2F0b3IoZWwpIHtcbiAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnbWF0Y2gnKTsgIFxuICB2YXIgcmVjdCA9IGVsLmNoaWxkcmVuWzFdXG4gIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHBhcnNlSW50KHJlY3QuZGF0YXNldC53aWR0aCkpO1xuICByZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgcGFyc2VJbnQocmVjdC5kYXRhc2V0LmhlaWdodCkpO1xufVxuXG5mdW5jdGlvbiBhZGRCbGluayhlbCkge1xuICBlbC5jbGFzc0xpc3QuYWRkKCdibGluaycpOyAgXG59XG5cbmZ1bmN0aW9uIHJlbW92ZUJsaW5rKGVsKSB7XG4gIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2JsaW5rJyk7ICBcbn1cblxuZnVuY3Rpb24gY2xlYXJNYXRjaGVzKCkge1xuICB2YXIgbWF0Y2hlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2cuZnVuY19nLm1hdGNoJyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbWF0Y2hlcy5sZW5ndGg7IGkrKykge1xuICAgIHJlbW92ZU1hdGNoSW5kaWNhdG9yKG1hdGNoZXMuaXRlbShpKSk7ICBcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhckJsaW5rcygpIHtcbiAgdmFyIG1hdGNoZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdnLmZ1bmNfZy5ibGluaycpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICByZW1vdmVCbGluayhtYXRjaGVzLml0ZW0oaSkpOyAgXG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYXJFcnJvcigpIHtcbiAgc2VhcmNoRXJyb3JFbC52YWx1ZSA9ICcnO1xufVxuXG5mdW5jdGlvbiBpbmRpY2F0ZU1hdGNoKGVsLCBibGluaykge1xuICBhZGRNYXRjaEluZGljYXRvcihlbCk7XG4gIGlmIChibGluaykgYWRkQmxpbmsoZWwpO1xufVxuXG5mdW5jdGlvbiBvblF1ZXJ5Q2hhbmdlKCkge1xuICBjbGVhck1hdGNoZXMoKTtcbiAgY2xlYXJCbGlua3MoKTtcbiAgY2xlYXJFcnJvcigpO1xuXG4gIHZhciBxdWVyeSA9IHNlYXJjaEZpZWxkRWwudmFsdWUudHJpbSgpO1xuICB2YXIgaXNyZWdleCA9IHJlZ2V4Q2hlY2tFbC5jaGVja2VkO1xuICB2YXIgYmxpbmsgPSBibGlua0NoZWNrRWwuY2hlY2tlZDtcbiAgaWYgKCFxdWVyeS5sZW5ndGgpIHJldHVybjtcblxuICB2YXIgcmVnZXg7XG4gIGlmIChpc3JlZ2V4KSB7IFxuICAgIHJlZ2V4ID0gdHJ5TWFrZVJlZ2V4KHF1ZXJ5KTtcbiAgICBpZiAoIXJlZ2V4KSByZXR1cm47XG4gIH0gZWxzZSB7XG4gICAgcXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgdmFyIGZ1bmNfZ3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdnLmZ1bmNfZycpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGZ1bmNfZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZnVuY19nID0gZnVuY19nc1tpXTtcblxuICAgIGlmIChpc3JlZ2V4KSB7XG4gICAgICBpZiAocmVnZXgudGVzdChmdW5jX2cuZGF0YXNldC5zZWFyY2gpKSBpbmRpY2F0ZU1hdGNoKGZ1bmNfZywgYmxpbmspO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAofmZ1bmNfZy5kYXRhc2V0LnNlYXJjaC5pbmRleE9mKHF1ZXJ5KSkgaW5kaWNhdGVNYXRjaChmdW5jX2csIGJsaW5rKTtcbiAgICB9XG4gIH1cbn1cblxuXG52YXIgZ28gPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaXRTZWFyY2goKSB7XG4gIHNlYXJjaEZpZWxkRWwuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBkZWJvdW5jZShvblF1ZXJ5Q2hhbmdlLCAyMDApKTtcbiAgcmVnZXhDaGVja0VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIG9uUXVlcnlDaGFuZ2UpO1xuICBibGlua0NoZWNrRWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgb25RdWVyeUNoYW5nZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzLnJlZnJlc2ggPSBvblF1ZXJ5Q2hhbmdlO1xuXG4iLCIndXNlIHN0cmljdCc7XG4vKmpzaGludCBicm93c2VyOiB0cnVlKi9cblxudmFyIGZsYW1lZ3JhcGggPSByZXF1aXJlKCcuLi8nKVxuICAsIGppdFJlc29sdmVyID0gcmVxdWlyZSgncmVzb2x2ZS1qaXQtc3ltYm9scycpXG4gICwgaW5pdFNlYXJjaCA9IHJlcXVpcmUoJy4vaW5pdC1zZWFyY2gnKVxuICAsIHJlc29sdmVyO1xuXG52YXIgb3B0c1RlbXBsYXRlID0gcmVxdWlyZSgnLi9vcHRzLXRlbXBsYXRlLmhicycpO1xuXG52YXIgZmxhbWVncmFwaEVsICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZsYW1lZ3JhcGgnKTtcbnZhciBjYWxsZ3JhcGhGaWxlRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FsbGdyYXBoLWZpbGUnKVxudmFyIG1hcEZpbGVFbCAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtZmlsZScpXG52YXIgb3B0aW9uc0VsICAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29wdGlvbnMnKTtcbnZhciBpbnN0cnVjdGlvbnNFbCAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5zdHJ1Y3Rpb25zJyk7XG5cbnZhciBleGNsdWRlT3B0aW9ucyA9IFsgJ2ZvbnR0eXBlJywgJ2ZvbnR3aWR0aCcsICdjb3VudG5hbWUnLCAnY29sb3JzJywgJ3RpbWVtYXgnLCAnZmFjdG9yJywgJ2hhc2gnLCAndGl0bGUnLCAndGl0bGVzdHJpbmcnLCAnbmFtZXR5cGUnLCAnYmdjb2xvcjEnLCAnYmdjb2xvcjInIF07XG52YXIgdXNlZE1ldGFLZXlzID0gT2JqZWN0LmtleXMoZmxhbWVncmFwaC5kZWZhdWx0T3B0c01ldGEpLmZpbHRlcihmdW5jdGlvbiAoaykgeyByZXR1cm4gIX5leGNsdWRlT3B0aW9ucy5pbmRleE9mKGspIH0pO1xuXG52YXIgY3VycmVudENhbGxncmFwaDtcblxuZnVuY3Rpb24gcmVuZGVyT3B0aW9ucygpIHtcbiAgdmFyIG9wdHMgPSBmbGFtZWdyYXBoLmRlZmF1bHRPcHRzXG4gICAgLCBtZXRhID0gZmxhbWVncmFwaC5kZWZhdWx0T3B0c01ldGE7XG5cbiAgdmFyIGNvbnRleHQgPSB1c2VkTWV0YUtleXNcbiAgICAucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGspIHtcbiAgICAgIHZhciB0eXBlID0gbWV0YVtrXS50eXBlO1xuICAgICAgcmV0dXJuIGFjYy5jb25jYXQoe1xuICAgICAgICAgIG5hbWUgICAgICAgIDoga1xuICAgICAgICAsIHZhbHVlICAgICAgIDogb3B0c1trXVxuICAgICAgICAsIHR5cGUgICAgICAgIDogdHlwZVxuICAgICAgICAsIGRlc2NyaXB0aW9uIDogbWV0YVtrXS5kZXNjcmlwdGlvblxuICAgICAgICAsIG1pbiAgICAgICAgIDogbWV0YVtrXS5taW5cbiAgICAgICAgLCBtYXggICAgICAgICA6IG1ldGFba10ubWF4XG4gICAgICAgICwgc3RlcCAgICAgICAgOiBtZXRhW2tdLnN0ZXBcbiAgICAgIH0pO1xuICAgIH0sIFtdKTtcbiAgdmFyIGh0bWwgPSBvcHRzVGVtcGxhdGUoY29udGV4dCk7XG4gIG9wdGlvbnNFbC5pbm5lckhUTUwgPSBodG1sO1xuXG4gIC8vIE5lZWQgdG8gc2V0IHZhbHVlIGluIEpTIHNpbmNlIGl0J3Mgbm90IHBpY2tlZCB1cCB3aGVuIHNldCBpbiBodG1sIHRoYXQgaXMgYWRkZWQgdG8gRE9NIGFmdGVyd2FyZHNcbiAgdXNlZE1ldGFLZXlzIFxuICAgIC5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICB2YXIgdmFsID0gb3B0c1trXTtcbiAgICAgIHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGspO1xuICAgICAgZWwudmFsdWUgPSB2YWw7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gZ2V0T3B0aW9ucygpIHtcbiAgdmFyIG1ldGEgPSBmbGFtZWdyYXBoLmRlZmF1bHRPcHRzTWV0YTtcblxuICByZXR1cm4gdXNlZE1ldGFLZXlzIFxuICAgIC5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgaykge1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoayk7XG4gICAgICB2YXIgdmFsID0gZWwudmFsdWU7XG4gICAgICBpZiAobWV0YVtrXS50eXBlID09PSAnbnVtYmVyJykge1xuICAgICAgICB2YWwgPSB2YWwubGVuZ3RoID8gcGFyc2VGbG9hdCh2YWwpIDogSW5maW5pdHk7XG4gICAgICB9IGVsc2UgaWYgKG1ldGFba10udHlwZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHZhbCA9IHZhbC5sZW5ndGggPyBCb29sZWFuKHZhbCkgOiBmYWxzZTsgXG4gICAgICB9IGVsc2UgaWYgKG1ldGFba10udHlwZSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICB2YWwgPSBlbC5jaGVja2VkID8gdHJ1ZSA6IGZhbHNlXG4gICAgICB9XG4gICAgICBhY2Nba10gPSB2YWw7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIGZsYW1lZ3JhcGguZGVmYXVsdE9wdHMpO1xufVxuXG5mdW5jdGlvbiBvbk9wdGlvbnNDaGFuZ2UoZSkge1xuICByZWZyZXNoKCk7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQ2hhbmdlKCkge1xuICB2YXIgaW5wdXRzID0gb3B0aW9uc0VsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXG4gICAgLCBpLCBlbDtcbiAgXG4gIGZvciAoaSA9IDA7IGkgPCBpbnB1dHMubGVuZ3RoOyBpKyspIHtcbiAgICBlbCA9IGlucHV0c1tpXTtcbiAgICBlbC5vbmNoYW5nZSA9IG9uT3B0aW9uc0NoYW5nZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBob29rSG92ZXJNZXRob2RzKCkge1xuICB2YXIgZGV0YWlscyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGV0YWlsc1wiKS5maXJzdENoaWxkO1xuICB3aW5kb3cucyA9IGZ1bmN0aW9uIHMoaW5mbykgeyBcbiAgICBkZXRhaWxzLm5vZGVWYWx1ZSA9IFwiRnVuY3Rpb246IFwiICsgaW5mbzsgXG4gIH1cbiAgd2luZG93LmMgPSBmdW5jdGlvbiBjKCkgeyBcbiAgICBkZXRhaWxzLm5vZGVWYWx1ZSA9ICcgJzsgXG4gIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyKGFycikge1xuICBpZiAoaW5zdHJ1Y3Rpb25zRWwucGFyZW50RWxlbWVudCkgaW5zdHJ1Y3Rpb25zRWwucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChpbnN0cnVjdGlvbnNFbCk7XG5cbiAgdmFyIG9wdHMgPSBnZXRPcHRpb25zKCk7XG5cbiAgdmFyIHN2ZztcbiAgdHJ5IHtcbiAgICBjdXJyZW50Q2FsbGdyYXBoID0gYXJyO1xuICAgIHN2ZyA9IGZsYW1lZ3JhcGgoYXJyLCBvcHRzKTtcbiAgICBmbGFtZWdyYXBoRWwuaW5uZXJIVE1MPSBzdmc7XG4gICAgaG9va0hvdmVyTWV0aG9kcygpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBmbGFtZWdyYXBoRWwuaW5uZXJIVE1MID0gJzxicj48cCBjbGFzcz1cImVycm9yXCI+JyArIGVyci50b1N0cmluZygpICsgJzwvcD4nO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gIGlmICghY3VycmVudENhbGxncmFwaCkgcmV0dXJuO1xuICByZW5kZXIoY3VycmVudENhbGxncmFwaCk7XG4gIGluaXRTZWFyY2gucmVmcmVzaCgpO1xufVxuXG5mdW5jdGlvbiByZWFkRmlsZShmaWxlLCBjYikge1xuICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gIGZpbGVSZWFkZXIucmVhZEFzVGV4dChmaWxlLCAndXRmLTgnKTtcbiAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiBvbmxvYWQoZXJyKSB7XG4gICAgY2IoZXJyLCBmaWxlUmVhZGVyLnJlc3VsdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gb25GaWxlKGUsIHByb2Nlc3MpIHtcbiAgdmFyIGZpbGUgPSBlLnRhcmdldC5maWxlc1swXTtcbiAgaWYgKCFmaWxlKSByZXR1cm47XG4gIHJlYWRGaWxlKGZpbGUsIHByb2Nlc3MpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzQ2FsbGdyYXBoRmlsZShlKSB7XG4gIHZhciBhcnIgPSBlLnRhcmdldC5yZXN1bHQuc3BsaXQoJ1xcbicpO1xuICBpZiAocmVzb2x2ZXIpIGFyciA9IHJlc29sdmVyLnJlc29sdmVNdWx0aShhcnIpO1xuICByZW5kZXIoYXJyKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc01hcEZpbGUoZSkge1xuICB2YXIgbWFwID0gZS50YXJnZXQucmVzdWx0O1xuICByZXNvbHZlciA9IGppdFJlc29sdmVyKG1hcCk7XG4gIGlmIChjdXJyZW50Q2FsbGdyYXBoKSBjdXJyZW50Q2FsbGdyYXBoID0gcmVzb2x2ZXIucmVzb2x2ZU11bHRpKGN1cnJlbnRDYWxsZ3JhcGgpO1xuICByZWZyZXNoKCk7XG59XG5cbmZ1bmN0aW9uIG9uQ2FsbGdyYXBoRmlsZShlKSB7XG4gIG9uRmlsZShlLCBwcm9jZXNzQ2FsbGdyYXBoRmlsZSk7XG59XG5cbmZ1bmN0aW9uIG9uTWFwRmlsZShlKSB7XG4gIG9uRmlsZShlLCBwcm9jZXNzTWFwRmlsZSk7XG59XG5cbi8vIEV2ZW50IExpc3RlbmVyc1xuY2FsbGdyYXBoRmlsZUVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIG9uQ2FsbGdyYXBoRmlsZSk7XG5tYXBGaWxlRWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgb25NYXBGaWxlKTtcblxuLy8gU2V0dXAgXG5yZW5kZXJPcHRpb25zKCk7XG5yZWdpc3RlckNoYW5nZSgpO1xuaW5pdFNlYXJjaChmbGFtZWdyYXBoRWwpO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdmFyIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJvcHRpb25zLWlucHV0XFxcIj5cXG4gIDxwPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGVzY3JpcHRpb24gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRlc2NyaXB0aW9uIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImRlc2NyaXB0aW9uXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvcD5cXG4gIDxpbnB1dCB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnR5cGUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnR5cGUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgdmFsdWVcXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy52YWx1ZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudmFsdWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidmFsdWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmNoZWNrZWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNoZWNrZWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiY2hlY2tlZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCIgbWluPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm1pbiB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubWluIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcIm1pblwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG1heD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5tYXggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1heCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJtYXhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBzdGVwPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnN0ZXAgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnN0ZXAgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic3RlcFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcbjwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB2YXIgc3RhY2sxLCBidWZmZXIgPSBcIlwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMCwge1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgcmV0dXJuIGJ1ZmZlcjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIl19
