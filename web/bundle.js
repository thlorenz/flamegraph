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

},{"./lib/default-opts":"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts.js","./lib/default-opts-meta":"/Volumes/d/dev/js/projects/flamegraph/lib/default-opts-meta.js","./lib/detect-inputtype":"/Volumes/d/dev/js/projects/flamegraph/lib/detect-inputtype.js","./lib/filter-internals":"/Volumes/d/dev/js/projects/flamegraph/lib/filter-internals.js","./lib/filter-lazycompile":"/Volumes/d/dev/js/projects/flamegraph/lib/filter-lazycompile.js","./lib/stackcollapse":"/Volumes/d/dev/js/projects/flamegraph/lib/stackcollapse.js","./lib/svg":"/Volumes/d/dev/js/projects/flamegraph/lib/svg.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-cpuprofile.js":[function(require,module,exports){
'use strict';

function nodeToText(node) {
  return node.functionName +
    (node.url        ? ' ' + node.url        : '') +
    (node.lineNumber ? ':' + node.lineNumber : '')
}

function collapseRec(node, parents, hash) {
  parents.forEach(function (p) {
    p.retainedHitCount += node.hitCount;
  })

  node.retainedHitCount = node.hitCount;

  parents = parents.concat(node);

  var p, i, text = '';

  if (!node.children || !node.children.length) {
    // when we reach the leaf we process it and it's parents
    for (i = 0; i < parents.length; i++) {
      p = parents[i];  
      if (i > 0) text += ';';

      text += nodeToText(p);

      if (!hash[text]) hash[text] = p.retainedHitCount;
      else hash[text] += p.retainedHitCount;
    }
    return;
  }

  for (i = 0; i < node.children.length; i++) {
    collapseRec(node.children[i], parents, hash);
  }

}

function toLine(k, idx, hash) {
  /*jshint validthis:true */
  return k + ' ' + this[k]    
}

function CpuProfileCollapser() {
  if (!(this instanceof CpuProfileCollapser)) return new CpuProfileCollapser();
  this._lines = [];
}

module.exports = CpuProfileCollapser; 
var proto = CpuProfileCollapser.prototype;

proto._collapse = function collapse(obj) {
  var root = obj.head;
  var hash = {};
  collapseRec(root, [], hash);
  return Object.keys(hash).map(toLine, hash);
}

proto.collapseArray = function collapseArray(arr) {
  var json = arr.join('\n');
  return this._collapse(JSON.parse(json));
}
/*
// Test
function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

if (!module.parent && typeof window === 'undefined') {
  var json = require('fs').readFileSync(__dirname + '/../test/fixtures/v8-profiler.cpuprofile');
  var obj = JSON.parse(json);
  var res = new CpuProfileCollapser()._collapse(obj)
  require('fs').writeFileSync(__dirname + '/../test/fixtures/v8-profiler.folded', res.join('\n'));
}*/

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-instruments.js":[function(require,module,exports){
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

  function markNarrowBlocks(nodes) {

    function mark(k) {
      var val = parsed.nodes[k];
      if (typeof val.stime !== 'number') throw new Error('Missing start for ' + k);
      if ((val.etime - val.stime) < minWidthTime) {
        val.narrow = true;
        return;
      }

      val.narrow = false;
      depthMax = Math.max(val.depth, depthMax);
    }

    Object.keys(nodes).forEach(mark);
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
      , text      : text
      , text_x    : x1 + (showText ? 3 : 0)
      , text_y    : 3 + (y1 + y2) / 2
      , narrow    : node.narrow
      , func      : htmlEscape(func)
    }
  }

  markNarrowBlocks(parsed.nodes);

  var imageHeight = (depthMax * frameHeight) + ypadTop + ypadBottom;
  var ctx = xtend(opts, {
      imageheight : imageHeight
    , xpad        : xpad
    , titleX      : opts.imagewidth / 2
    , detailsY    : imageHeight - (frameHeight / 2) 
  });

  ctx.nodes = Object.keys(parsed.nodes)
    .reduce(function (acc, k) {
      acc.push(processNode(parsed.nodes[k]));
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

  , removenarrows : true        // removes narrow functions instead of adding a 'hidden' class
  
  , internals: false
  , optimizationinfo: false
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/detect-inputtype.js":[function(require,module,exports){
'use strict';

var instrumentsRegex = /^Running Time, *Self,.*, *Symbol Name/;

// node 22610 13108.211038: cpu-clock:u: 
var perfRegex = /^\w+ +\d+ +\d+\.\d+:/;

// cpuprofile is JSON
var cpuprofileRegex = /^\s*?{/;

function firstLine(arr) {
  for (var i = 0; i < arr.length; i++) {
    // ignore empty lines and comments starting with #
    if (arr[i] && arr[i].length && arr[i][0] !== '#') return arr[i];
  }
}

var go = module.exports = function detectInputType(arr) {
  var first = firstLine(arr);
  if (!first) return null;

  if (instrumentsRegex.test(first)) return 'instruments';
  if (perfRegex.test(first)) return 'perf';
  if (cpuprofileRegex.test(first)) return 'cpuprofile'; 

  return null;
}

},{}],"/Volumes/d/dev/js/projects/flamegraph/lib/filter-internals.js":[function(require,module,exports){
'use strict';

var v8Internals =
    '__libc_start|node::Start\\('                                                     // node startup
  + '|v8::internal::|v8::Function::Call|v8::Function::NewInstance'                    // v8 internal C++
  + '|Builtin:|Stub:|StoreIC:|LoadIC:|LoadPolymorphicIC:|KeyedLoadIC:'                // v8 generated boilerplate 
  + '|<Unknown Address>|_platform_\\w+\\$VARIANT\\$|DYLD-STUB\\$|_os_lock_spin_lock'  // unknown and lower level things

var unresolveds = /;0x[0-9A-Fa-f]{2,12}/g // lonely unresolved hex address

var midHead  = '('
  , midTail  = ')[^;]+;'
  , lastHead = '(.+?);((?:'
  , lastTail = ')[^;]+?)( \\d+$)'

var v8MidRegex = new RegExp(midHead + v8Internals + midTail, 'g')
  , v8LastRegex = new RegExp(lastHead + v8Internals + lastTail)

function filterLine(l) {
  return l
    .replace(unresolveds, '')
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
  , cpuprofile = require('./collapse-cpuprofile')

function getCollapser(type) {
  switch(type) {
    case 'instruments':
      return instruments()
    case 'perf':
      return perf()
    case 'cpuprofile':
      return cpuprofile()
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
  
  if (typeof collapser.collapseArray === 'function') return collapser.collapseArray(arr);

  function online (line) {
    collapser.collapseLine(line);
  }

  function nonEmpty(line) {
    return line && line.length;
  }

  arr.forEach(online);

  return collapser.collapsedLines().filter(nonEmpty);
}

},{"./collapse-cpuprofile":"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-cpuprofile.js","./collapse-instruments":"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-instruments.js","./collapse-perf":"/Volumes/d/dev/js/projects/flamegraph/lib/collapse-perf.js"}],"/Volumes/d/dev/js/projects/flamegraph/lib/stackparse.js":[function(require,module,exports){
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
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda, buffer = "<g class=\"func_g "
    + escapeExpression(((helper = (helper = helpers['class'] || (depth0 != null ? depth0['class'] : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"class","hash":{},"data":data}) : helper)))
    + "\" onmouseover=\"s('";
  stack1 = ((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helper = (helper = helpers.samples || (depth0 != null ? depth0.samples : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"samples","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "')\" onmouseout=\"c()\" data-search=\"";
  stack1 = ((helper = (helper = helpers.search || (depth0 != null ? depth0.search : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"search","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\" data-funcname=\"";
  stack1 = ((helper = (helper = helpers.func || (depth0 != null ? depth0.func : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"func","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\">\n  <title>";
  stack1 = ((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helper = (helper = helpers.samples || (depth0 != null ? depth0.samples : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"samples","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "</title>\n  <rect x=\""
    + escapeExpression(((helper = (helper = helpers.rect_x || (depth0 != null ? depth0.rect_x : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"rect_x","hash":{},"data":data}) : helper)))
    + "\" data-x=\""
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
    + "\" rx=\"2\" ry=\"2\"></rect>\n  <text data-x=\""
    + escapeExpression(((helper = (helper = helpers.text_x || (depth0 != null ? depth0.text_x : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text_x","hash":{},"data":data}) : helper)))
    + "\" x=\""
    + escapeExpression(((helper = (helper = helpers.text_x || (depth0 != null ? depth0.text_x : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text_x","hash":{},"data":data}) : helper)))
    + "\" y=\""
    + escapeExpression(((helper = (helper = helpers.text_y || (depth0 != null ? depth0.text_y : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text_y","hash":{},"data":data}) : helper)))
    + "\" font-size=\""
    + escapeExpression(lambda((depths[1] != null ? depths[1].fontsize : depths[1]), depth0))
    + "\" font-family=\""
    + escapeExpression(lambda((depths[1] != null ? depths[1].fonttype : depths[1]), depth0))
    + "\" fill=\"rgb(0,0,0)\">";
  stack1 = ((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</text>\n</g>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<?xml version=\"1.0\" standalone=\"no\"?>\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n\n<svg version=\"1.1\" id=\"flamegraph-svg\" \n  data-width=\""
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + "\" width=\""
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + "\" \n  height=\""
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\" data-height=\""
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\"\n  onload=\"init(evt)\" \n  viewBox=\"0 0 "
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + " "
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\" \n  xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n\n<defs>\n	<linearGradient id=\"background\" y1=\"0\" y2=\"1\" x1=\"0\" x2=\"0\">\n    <stop stop-color=\""
    + escapeExpression(((helper = (helper = helpers.bgcolor1 || (depth0 != null ? depth0.bgcolor1 : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"bgcolor1","hash":{},"data":data}) : helper)))
    + "\" offset=\"5%\" />\n    <stop stop-color=\""
    + escapeExpression(((helper = (helper = helpers.bgcolor2 || (depth0 != null ? depth0.bgcolor2 : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"bgcolor2","hash":{},"data":data}) : helper)))
    + "\" offset=\"95%\" />\n	</linearGradient>\n</defs>\n<style type=\"text/css\">\n	.func_g:hover { stroke:black; stroke-width:0.5; }\n</style>\n<script type=\"text/javascript\">\n	var details;\n	function init(evt) { details = document.getElementById(\"details\").firstChild; }\n  function s(info) { details.nodeValue = \""
    + escapeExpression(((helper = (helper = helpers.nametype || (depth0 != null ? depth0.nametype : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"nametype","hash":{},"data":data}) : helper)))
    + ": \" + info; }\n	function c() { details.nodeValue = ' '; }\n</script>\n\n<rect x=\"0.0\" y=\"0\" id=\"svg-background\" width=\""
    + escapeExpression(((helper = (helper = helpers.imagewidth || (depth0 != null ? depth0.imagewidth : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imagewidth","hash":{},"data":data}) : helper)))
    + "\" height=\""
    + escapeExpression(((helper = (helper = helpers.imageheight || (depth0 != null ? depth0.imageheight : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"imageheight","hash":{},"data":data}) : helper)))
    + "\" fill=\"url(#background)\"  />\n<!--<text text-anchor=\"middle\" x=\""
    + escapeExpression(((helper = (helper = helpers.titleX || (depth0 != null ? depth0.titleX : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"titleX","hash":{},"data":data}) : helper)))
    + "\" y=\"24\" font-size=\"17\" font-family=\""
    + escapeExpression(((helper = (helper = helpers.fonttype || (depth0 != null ? depth0.fonttype : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fonttype","hash":{},"data":data}) : helper)))
    + "\" fill=\"rgb(0,0,0)\">";
  stack1 = ((helper = (helper = helpers.titletext || (depth0 != null ? depth0.titletext : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"titletext","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "</text>-->\n<text text-anchor=\"left\" x=\""
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

function narrowify(context, opts) {
  function processNode(n) {
    n.class = n.narrow ? 'hidden' : '';
  }

  function filterNode(n) {
    return !n.narrow;
  }

  if (opts.removenarrows) context.nodes = context.nodes.filter(filterNode);
  else context.nodes.forEach(processNode);
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

},{}],"/Volumes/d/dev/js/projects/flamegraph/node_modules/uniwheel/index.js":[function(require,module,exports){
(function(factory){
  if ( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define([], factory());
  } else if (typeof exports === 'object') {
    // Node/CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    window.wheel = factory();
  }
}
(function(){

  //Full details: https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel

  var prefix = "", _addEventListener, _removeEventListener, onwheel, support, fns = [];

  // detect event model
  if ( window.addEventListener ) {
    _addEventListener = "addEventListener";
    _removeEventListener = "removeEventListener";
  } else {
    _addEventListener = "attachEvent";
    _removeEventListener = "detachEvent";
    prefix = "on";
  }

  // detect available wheel event
  support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
            document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
            "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox


  function createCallback(element,callback,capture) {

    var fn = function(originalEvent) {

      !originalEvent && ( originalEvent = window.event );

      // create a normalized event object
      var event = {
        // keep a ref to the original event object
        originalEvent: originalEvent,
        target: originalEvent.target || originalEvent.srcElement,
        type: "wheel",
        deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
        deltaX: 0,
        delatZ: 0,
        preventDefault: function() {
          originalEvent.preventDefault ?
            originalEvent.preventDefault() :
            originalEvent.returnValue = false;
        }
      };
      
      // calculate deltaY (and deltaX) according to the event
      if ( support == "mousewheel" ) {
        event.deltaY = - 1/40 * originalEvent.wheelDelta;
        // Webkit also support wheelDeltaX
        originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
      } else {
        event.deltaY = originalEvent.detail;
      }

      // it's time to fire the callback
      return callback( event );

    };

    fns.push({
      element: element,
      fn: fn,
      capture: capture
    });

    return fn;
  }

  function getCallback(element,capture) {
    for (var i = 0; i < fns.length; i++) {
      if (fns[i].element === element && fns[i].capture === capture) {
        return fns[i].fn;
      }
    }
    return function(){};
  }

  function removeCallback(element,capture) {
    for (var i = 0; i < fns.length; i++) {
      if (fns[i].element === element && fns[i].capture === capture) {
        return fns.splice(i,1);
      }
    }
  }

  function _addWheelListener( elem, eventName, callback, useCapture ) {
    
    var cb;

    if (support === "wheel") {
      cb = callback;
    } else {
      cb = createCallback(elem,callback,useCapture);
    }

    elem[ _addEventListener ]( prefix + eventName, cb, useCapture || false );

  }

  function _removeWheelListener( elem, eventName, callback, useCapture ) {

    if (support === "wheel") {
      cb = callback;
    } else {
      cb = getCallback(elem,useCapture);
    }

    elem[ _removeEventListener ]( prefix + eventName, cb, useCapture || false );

    removeCallback(elem,useCapture);

  }

  function addWheelListener( elem, callback, useCapture ) {
    _addWheelListener( elem, support, callback, useCapture );

    // handle MozMousePixelScroll in older Firefox
    if( support == "DOMMouseScroll" ) {
        _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture);
    }
  }

  function removeWheelListener(elem,callback,useCapture){
    _removeWheelListener(elem,support,callback,useCapture);

    // handle MozMousePixelScroll in older Firefox
    if( support == "DOMMouseScroll" ) {
        _removeWheelListener(elem, "MozMousePixelScroll", callback, useCapture);
    }
  }

  return {
    on: addWheelListener,
    off: removeWheelListener
  };

}));
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
  if (w < 10) {
    rect.setAttribute('width', 10);
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
  , zoom = require('./zoom')()
  , resolver;

var optsTemplate = require('./opts-template.hbs');

var flamegraphEl    = document.getElementById('flamegraph');
var callgraphFileEl = document.getElementById('callgraph-file')
var mapFileEl       = document.getElementById('map-file')
var optionsEl       = document.getElementById('options');
var instructionsEl  = document.getElementById('instructions');

var excludeOptions = [ 'fonttype', 'fontwidth', 'fontsize', 'imagewidth', 'countname', 'colors', 'timemax', 'factor', 'hash', 'title', 'titlestring', 'nametype', 'bgcolor1', 'bgcolor2' ];
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
    opts.removenarrows = false;
    svg = flamegraph(arr, opts);
    flamegraphEl.innerHTML= svg;
    hookHoverMethods();
    zoom.init(opts);
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

},{"../":"/Volumes/d/dev/js/projects/flamegraph/index.js","./init-search":"/Volumes/d/dev/js/projects/flamegraph/web/init-search.js","./opts-template.hbs":"/Volumes/d/dev/js/projects/flamegraph/web/opts-template.hbs","./zoom":"/Volumes/d/dev/js/projects/flamegraph/web/zoom.js","resolve-jit-symbols":"/Volumes/d/dev/js/projects/flamegraph/node_modules/resolve-jit-symbols/index.js"}],"/Volumes/d/dev/js/projects/flamegraph/web/opts-template.hbs":[function(require,module,exports){
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

},{"hbsfy/runtime":"/Volumes/d/dev/js/projects/flamegraph/node_modules/hbsfy/runtime.js"}],"/Volumes/d/dev/js/projects/flamegraph/web/zoom.js":[function(require,module,exports){
'use strict';

var wheel = require('uniwheel');
var flamegraphEl = document.getElementById('flamegraph');

//console.log({ offsetY: e.offsetY, movementY: e.movementY, screenY: e.screenY });

function performZoom(zoom) {
  return function z(e) {
    zoom._zoom(e);
  }
}

function Zoom() {
  if (!(this instanceof Zoom)) return new Zoom();
  this._flamegraphSvgEl = undefined; 
  this._zoomLevel = 1;
}

var proto = Zoom.prototype;
module.exports = Zoom;

proto.init = function init(opts) {
  if (this._flamegraphSvgEl) wheel.off(this._flamegraphSvgEl, this._performZoom);

  this._zoomLevel = 1;

  this._flamegraphSvgEl = document.getElementById('flamegraph-svg');
  this._svgBackgroundEl = document.getElementById('svg-background');
  this._viewBoxWidth = this._flamegraphSvgEl.dataset.width;
  this._viewBoxHeight = this._flamegraphSvgEl.dataset.height;
  this._performZoom = performZoom(this);

  this._opts = opts;

  if (this._flamegraphSvgEl) wheel.on(this._flamegraphSvgEl, this._performZoom, false);
}

proto._redrawText = function _redrawText(funcName, textEl, width) {
  var chars = width / 8 // (opts.fontsize * opts.fontwidth)
  var text;
  if (chars >= 3) { // enough room to display function name?
    text = funcName.slice(0, chars);
    if (chars < funcName.length) text = text.slice(0, chars - 2) + '..';
    textEl.textContent = text;
  } else {
    textEl.textContent = '';
  }
}


proto._zoomRects = function _zoomRects() {
  var func, text, rect, children, w, x, funcName;
  var newWidth, newX;
  
  // zoom width of each rect 
  var funcs = document.querySelectorAll('g.func_g');
  for (var i = 0; i < funcs.length; i++) {
    func = funcs[i];
    text = func.children[2];
    rect = func.children[1];
  
    w = rect.dataset.width;
    newWidth = w * this._zoomLevel;

    // ensure to keep search matches visible
    if (func.classList.contains('match') && newWidth < 10) newWidth = 10;

    // hide/show rects according to change width
    if (newWidth < this._opts.minwidth) func.classList.add('hidden');
    else func.classList.remove('hidden');

    x = rect.dataset.x;
    newX = x * this._zoomLevel;
    
    rect.setAttribute('width', newWidth);
    rect.setAttribute('x', newX);
    
    if (!text) continue;
    x = text.dataset.x;
    text.setAttribute('x', x * this._zoomLevel);

    funcName = func.dataset.funcname;
    this._redrawText(funcName, text, w * this._zoomLevel);
  }
}

proto._zoom = function _zoom(e) {
  if (!e.ctrlKey) return;

  var add = (-e.wheelDeltaY / 400 * this._zoomLevel );
  if (!add) return;

  this._zoomLevel = add + this._zoomLevel;
  this._zoomLevel = Math.max(1, this._zoomLevel);
  this._zoomLevel = Math.min(5000, this._zoomLevel);

  var w, x, currentWidth, newWidth, newViewBox, viewX;

  // zoom overall image width
  currentWidth = this._flamegraphSvgEl.getAttribute('width')
  w = this._flamegraphSvgEl.dataset.width;
  x = this._flamegraphSvgEl.dataset.x;

  newWidth = w * this._zoomLevel;
  newViewBox = '0 0 ' + newWidth + ' ' + this._viewBoxHeight;

  this._flamegraphSvgEl.setAttribute('width', newWidth);
  this._svgBackgroundEl.setAttribute('width', newWidth);
  this._flamegraphSvgEl.setAttribute('viewBox', newViewBox)

  this._zoomRects();

  var scrollRatio = flamegraphEl.scrollLeft / currentWidth;
  flamegraphEl.scrollLeft = newWidth * scrollRatio;
}

},{"uniwheel":"/Volumes/d/dev/js/projects/flamegraph/node_modules/uniwheel/index.js"}]},{},["/Volumes/d/dev/js/projects/flamegraph/web/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb2xsYXBzZS1jcHVwcm9maWxlLmpzIiwibGliL2NvbGxhcHNlLWluc3RydW1lbnRzLmpzIiwibGliL2NvbGxhcHNlLXBlcmYuanMiLCJsaWIvY29sb3ItbWFwLmpzIiwibGliL2NvbnRleHRpZnkuanMiLCJsaWIvZGVmYXVsdC1vcHRzLW1ldGEuanMiLCJsaWIvZGVmYXVsdC1vcHRzLmpzIiwibGliL2RldGVjdC1pbnB1dHR5cGUuanMiLCJsaWIvZmlsdGVyLWludGVybmFscy5qcyIsImxpYi9maWx0ZXItbGF6eWNvbXBpbGUuanMiLCJsaWIvc3RhY2tjb2xsYXBzZS5qcyIsImxpYi9zdGFja3BhcnNlLmpzIiwibGliL3N2Zy1jbGllbnQtdGVtcGxhdGUuanMiLCJsaWIvc3ZnLmhicyIsImxpYi9zdmcuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJub2RlX21vZHVsZXMvZGVib3VuY2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVib3VuY2Uvbm9kZV9tb2R1bGVzL2RhdGUtbm93L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24uanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGJzZnkvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXNvbHZlLWppdC1zeW1ib2xzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3VuaXdoZWVsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL2ltbXV0YWJsZS5qcyIsIndlYi9pbml0LXNlYXJjaC5qcyIsIndlYi9tYWluLmpzIiwid2ViL29wdHMtdGVtcGxhdGUuaGJzIiwid2ViL3pvb20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRldGVjdElucHV0VHlwZSA9IHJlcXVpcmUoJy4vbGliL2RldGVjdC1pbnB1dHR5cGUnKVxuICAsIHN0YWNrQ29sbGFwc2UgICA9IHJlcXVpcmUoJy4vbGliL3N0YWNrY29sbGFwc2UnKVxuICAsIHN2ZyAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL3N2ZycpXG4gICwgZGVmYXVsdE9wdHMgICAgID0gcmVxdWlyZSgnLi9saWIvZGVmYXVsdC1vcHRzJylcbiAgLCBkZWZhdWx0T3B0c01ldGEgPSByZXF1aXJlKCcuL2xpYi9kZWZhdWx0LW9wdHMtbWV0YScpXG4gICwgZmlsdGVySW50ZXJuYWxzID0gcmVxdWlyZSgnLi9saWIvZmlsdGVyLWludGVybmFscycpXG4gICwgZmlsdGVyTGF6eSAgICAgID0gcmVxdWlyZSgnLi9saWIvZmlsdGVyLWxhenljb21waWxlJylcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID1cblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBhcnJheSBvZiBjYWxsIGdyYXBoIGxpbmVzIGludG8gYW4gc3ZnIGRvY3VtZW50LlxuICogSWYgYG9wdHMuaW5wdXR0eXBlYCBpcyBub3QgZ2l2ZW4gaXQgd2lsbCBiZSBkZXRlY3RlZCBmcm9tIHRoZSBpbnB1dC5cbiAqXG4gKiBAbmFtZSBmbGFtZWdyYXBoXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXkuPHN0cmluZz59IGFyciAgICAgIGlucHV0IGxpbmVzIHRvIHJlbmRlciBzdmcgZm9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBvYmplY3RzIHRoYXQgYWZmZWN0IHRoZSB2aXN1YWxpemF0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5pbnB1dHR5cGUgICAgICAgdGhlIHR5cGUgb2YgY2FsbGdyYXBoIGBpbnN0cnVtZW50cyB8IHBlcmZgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5mb250dHlwZSAgICAgICAgdHlwZSBvZiBmb250IHRvIHVzZSAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAnVmVyZGFuYSdgXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0cy5mb250c2l6ZSAgICAgICAgYmFzZSB0ZXh0IHNpemUgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGAxMmBcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLmltYWdld2lkdGggICAgICBtYXggd2lkdGgsIHBpeGVscyAgICAgICAgICAgICAgICAgZGVmYXVsdDogYDEyMDBgXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0cy5mcmFtZWhlaWdodCAgICAgbWF4IGhlaWdodCBpcyBkeW5hbWljICAgICAgICAgICAgIGRlZmF1bHQ6IGAxNi4wYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuZm9udHdpZHRoICAgICAgIGF2ZyB3aWR0aCByZWxhdGl2ZSB0byBmb250c2l6ZSAgICBkZWZhdWx0OiBgMC41OWBcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLm1pbndpZHRoICAgICAgICBtaW4gZnVuY3Rpb24gd2lkdGgsIHBpeGVscyAgICAgICAgZGVmYXVsdDogYDAuMWBcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmNvdW50bmFtZSAgICAgICB3aGF0IGFyZSB0aGUgY291bnRzIGluIHRoZSBkYXRhPyAgZGVmYXVsdDogYCdzYW1wbGVzJ2BcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmNvbG9ycyAgICAgICAgICBjb2xvciB0aGVtZSAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogYCdob3QnYFxuICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuYmdjb2xvcjEgICAgICAgIGJhY2tncm91bmQgY29sb3IgZ3JhZGllbnQgc3RhcnQgICBkZWZhdWx0OiBgJyNlZWVlZWUnYFxuICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuYmdjb2xvcjIgICAgICAgIGJhY2tncm91bmQgY29sb3IgZ3JhZGllbnQgc3RvcCAgICBkZWZhdWx0OiBgJyNlZWVlYjAnYFxuICogQHBhcmFtIHtudW1iZXJ9IG9wdHMudGltZW1heCAgICAgICAgIChvdmVycmlkZSB0aGUpIHN1bSBvZiB0aGUgY291bnRzICBkZWZhdWx0OiBgSW5maW5pdHlgXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0cy5mYWN0b3IgICAgICAgICAgZmFjdG9yIHRvIHNjYWxlIGNvdW50cyBieSAgICAgICAgIGRlZmF1bHQ6IGAxYFxuICogQHBhcmFtIHtib29sZWFufSBvcHRzLmhhc2ggICAgICAgICAgIGNvbG9yIGJ5IGZ1bmN0aW9uIG5hbWUgICAgICAgICAgICBkZWZhdWx0OiBgdHJ1ZWBcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLnRpdGxldGV4dCAgICAgICBjZW50ZXJlZCBoZWFkaW5nICAgICAgICAgICAgICAgICAgZGVmYXVsdDogYCdGbGFtZSBHcmFwaCdgXG4gKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5uYW1ldHlwZSAgICAgICAgd2hhdCBhcmUgdGhlIG5hbWVzIGluIHRoZSBkYXRhPyAgIGRlZmF1bHQ6IGAnRnVuY3Rpb246J2BcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5rZWVwT3B0aW1pemF0aW9uSW5mbyBrZWVwIGZ1bmN0aW9uIG9wdGltaXphdGlvbiBpbmZvcm1hdGlvbiAgZGVmYXVsdDogYGZhbHNlYFxuICogQHBhcmFtIHtib29sZWFufSBvcHRzLmtlZXBJbnRlcm5hbHMgIGtlZXAgaW50ZXJuYWwgbWV0aG9kcyAgICAgICAgICAgICBkZWZhdWx0OiBgZmFsc2VgXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHN2ZyAgICAgICAgICAgICAgICAgdGhlIHJlbmRlcmVkIHN2Z1xuICovXG5mdW5jdGlvbiBmbGFtZWdyYXBoKGFyciwgb3B0cykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJnIG5lZWRzIHRvIGJlIGFuIGFycmF5IG9mIGxpbmVzLicpO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuICB2YXIgY29sbGFwc2VkID0gc3RhY2tDb2xsYXBzZUZyb21BcnJheShhcnIsIG9wdHMuaW5wdXR0eXBlKTtcbiAgY29sbGFwc2VkID0gZmlsdGVyTGF6eShjb2xsYXBzZWQsIG9wdHMpO1xuICBpZiAoIW9wdHMuaW50ZXJuYWxzKSBjb2xsYXBzZWQgPSBmaWx0ZXJJbnRlcm5hbHMoY29sbGFwc2VkLCBvcHRzKTtcbiAgcmV0dXJuIHN2Zyhjb2xsYXBzZWQsIG9wdHMpO1xufVxuXG52YXIgc3RhY2tDb2xsYXBzZUZyb21BcnJheSA9IGV4cG9ydHMuc3RhY2tDb2xsYXBzZUZyb21BcnJheSA9IFxuXG4vKipcbiAqIENvbGxhcHNlcyBhIGNhbGxncmFwaCBpbnNpZGUgYSBnaXZlbiBsaW5lcyBhcnJheSBsaW5lIGJ5IGxpbmUuXG4gKiBcbiAqIEBuYW1lIGZsYW1lZ3JhcGg6OnN0YWNrQ29sbGFwc2VGcm9tQXJyYXlcbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgdGhlIHR5cGUgb2YgaW5wdXQgdG8gY29sbGFwc2UgKGlmIG5vdCBzdXBwbGllZCBpdCBpcyBkZXRlY3RlZCBmcm9tIHRoZSBpbnB1dClcbiAqIEBwYXJhbSB7QXJyYXkuPHN0cmluZz59IGFyciBsaW5lcyB0byBjb2xsYXBzZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59IGFycmF5IG9mIGNvbGxhcHNlZCBsaW5lc1xuICovXG5mdW5jdGlvbiBzdGFja0NvbGxwYXNlRnJvbUFycmF5IChhcnIsIGlucHV0VHlwZSkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJnIG5lZWRzIHRvIGJlIGFuIGFycmF5IG9mIGxpbmVzLicpO1xuXG4gIGlucHV0VHlwZSA9IGlucHV0VHlwZSB8fCBkZXRlY3RJbnB1dFR5cGUoYXJyKTtcbiAgaWYgKCFpbnB1dFR5cGUpIHRocm93IG5ldyBFcnJvcignTm8gaW5wdXQgdHlwZSBnaXZlbiBhbmQgdW5hYmxlIHRvIGRldGVjdCBpdCBmb3IgdGhlIGdpdmVuIGlucHV0IScpO1xuXG4gIHJldHVybiBzdGFja0NvbGxhcHNlKGlucHV0VHlwZSwgYXJyKTtcbn1cblxuZXhwb3J0cy5zdGFja0NvbGxhcHNlICAgPSBzdGFja0NvbGxhcHNlO1xuZXhwb3J0cy5zdmcgICAgICAgICAgICAgPSBzdmc7XG5leHBvcnRzLmRlZmF1bHRPcHRzICAgICA9IGRlZmF1bHRPcHRzO1xuZXhwb3J0cy5kZWZhdWx0T3B0c01ldGEgPSBkZWZhdWx0T3B0c01ldGE7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIG5vZGVUb1RleHQobm9kZSkge1xuICByZXR1cm4gbm9kZS5mdW5jdGlvbk5hbWUgK1xuICAgIChub2RlLnVybCAgICAgICAgPyAnICcgKyBub2RlLnVybCAgICAgICAgOiAnJykgK1xuICAgIChub2RlLmxpbmVOdW1iZXIgPyAnOicgKyBub2RlLmxpbmVOdW1iZXIgOiAnJylcbn1cblxuZnVuY3Rpb24gY29sbGFwc2VSZWMobm9kZSwgcGFyZW50cywgaGFzaCkge1xuICBwYXJlbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICBwLnJldGFpbmVkSGl0Q291bnQgKz0gbm9kZS5oaXRDb3VudDtcbiAgfSlcblxuICBub2RlLnJldGFpbmVkSGl0Q291bnQgPSBub2RlLmhpdENvdW50O1xuXG4gIHBhcmVudHMgPSBwYXJlbnRzLmNvbmNhdChub2RlKTtcblxuICB2YXIgcCwgaSwgdGV4dCA9ICcnO1xuXG4gIGlmICghbm9kZS5jaGlsZHJlbiB8fCAhbm9kZS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAvLyB3aGVuIHdlIHJlYWNoIHRoZSBsZWFmIHdlIHByb2Nlc3MgaXQgYW5kIGl0J3MgcGFyZW50c1xuICAgIGZvciAoaSA9IDA7IGkgPCBwYXJlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwID0gcGFyZW50c1tpXTsgIFxuICAgICAgaWYgKGkgPiAwKSB0ZXh0ICs9ICc7JztcblxuICAgICAgdGV4dCArPSBub2RlVG9UZXh0KHApO1xuXG4gICAgICBpZiAoIWhhc2hbdGV4dF0pIGhhc2hbdGV4dF0gPSBwLnJldGFpbmVkSGl0Q291bnQ7XG4gICAgICBlbHNlIGhhc2hbdGV4dF0gKz0gcC5yZXRhaW5lZEhpdENvdW50O1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNvbGxhcHNlUmVjKG5vZGUuY2hpbGRyZW5baV0sIHBhcmVudHMsIGhhc2gpO1xuICB9XG5cbn1cblxuZnVuY3Rpb24gdG9MaW5lKGssIGlkeCwgaGFzaCkge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICByZXR1cm4gayArICcgJyArIHRoaXNba10gICAgXG59XG5cbmZ1bmN0aW9uIENwdVByb2ZpbGVDb2xsYXBzZXIoKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDcHVQcm9maWxlQ29sbGFwc2VyKSkgcmV0dXJuIG5ldyBDcHVQcm9maWxlQ29sbGFwc2VyKCk7XG4gIHRoaXMuX2xpbmVzID0gW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ3B1UHJvZmlsZUNvbGxhcHNlcjsgXG52YXIgcHJvdG8gPSBDcHVQcm9maWxlQ29sbGFwc2VyLnByb3RvdHlwZTtcblxucHJvdG8uX2NvbGxhcHNlID0gZnVuY3Rpb24gY29sbGFwc2Uob2JqKSB7XG4gIHZhciByb290ID0gb2JqLmhlYWQ7XG4gIHZhciBoYXNoID0ge307XG4gIGNvbGxhcHNlUmVjKHJvb3QsIFtdLCBoYXNoKTtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGhhc2gpLm1hcCh0b0xpbmUsIGhhc2gpO1xufVxuXG5wcm90by5jb2xsYXBzZUFycmF5ID0gZnVuY3Rpb24gY29sbGFwc2VBcnJheShhcnIpIHtcbiAgdmFyIGpzb24gPSBhcnIuam9pbignXFxuJyk7XG4gIHJldHVybiB0aGlzLl9jb2xsYXBzZShKU09OLnBhcnNlKGpzb24pKTtcbn1cbi8qXG4vLyBUZXN0XG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgZGVwdGgpIHtcbiAgY29uc29sZS5lcnJvcihyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChvYmosIGZhbHNlLCBkZXB0aCB8fCA1LCB0cnVlKSk7XG59XG5cbmlmICghbW9kdWxlLnBhcmVudCAmJiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICB2YXIganNvbiA9IHJlcXVpcmUoJ2ZzJykucmVhZEZpbGVTeW5jKF9fZGlybmFtZSArICcvLi4vdGVzdC9maXh0dXJlcy92OC1wcm9maWxlci5jcHVwcm9maWxlJyk7XG4gIHZhciBvYmogPSBKU09OLnBhcnNlKGpzb24pO1xuICB2YXIgcmVzID0gbmV3IENwdVByb2ZpbGVDb2xsYXBzZXIoKS5fY29sbGFwc2Uob2JqKVxuICByZXF1aXJlKCdmcycpLndyaXRlRmlsZVN5bmMoX19kaXJuYW1lICsgJy8uLi90ZXN0L2ZpeHR1cmVzL3Y4LXByb2ZpbGVyLmZvbGRlZCcsIHJlcy5qb2luKCdcXG4nKSk7XG59Ki9cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlZ2V4cCA9IC8oXFxkKylcXC5cXGQrbXNbXixdKyxcXGQrLFxccyssKFxccyopKC4rKS87XG5cbmZ1bmN0aW9uIGFkZEZyYW1lKGYpIHtcbiAgcmV0dXJuIGYgKyAnOyc7XG59XG5cbmZ1bmN0aW9uIEluc3RydW1lbnRzQ29sbGFwc2VyKCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgSW5zdHJ1bWVudHNDb2xsYXBzZXIpKSByZXR1cm4gbmV3IEluc3RydW1lbnRzQ29sbGFwc2VyKCk7XG5cbiAgdGhpcy5zdGFjayA9IFtdO1xuICB0aGlzLmNvbGxhcHNlZCA9IFtdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RydW1lbnRzQ29sbGFwc2VyO1xudmFyIHByb3RvID0gSW5zdHJ1bWVudHNDb2xsYXBzZXIucHJvdG90eXBlO1xuXG5wcm90by5jb2xsYXBzZUxpbmUgPSBmdW5jdGlvbiBjb2xsYXBzZUxpbmUobGluZSkge1xuICB2YXIgbWF0Y2hlcyA9IGxpbmUubWF0Y2gocmVnZXhwKTtcbiAgaWYgKCFtYXRjaGVzIHx8ICFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBtcyAgICA9IG1hdGNoZXNbMV07XG4gIHZhciBkZXB0aCA9IG1hdGNoZXNbMl0ubGVuZ3RoO1xuXG4gIHZhciBmbiAgICA9IG1hdGNoZXNbM107XG4gIHRoaXMuc3RhY2tbZGVwdGhdID0gZm47XG5cbiAgdmFyIHJlcyA9ICcnO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGRlcHRoOyBpKyspIHJlcyArPSBhZGRGcmFtZSh0aGlzLnN0YWNrW2ldKVxuICAgIFxuICByZXMgKz0gZm4gKyAnICcgKyBtcyArICdcXG4nO1xuXG4gIHRoaXMuY29sbGFwc2VkLnB1c2gocmVzLnRyaW0oJ1xcbicpKTtcbn1cblxucHJvdG8uY29sbGFwc2VkTGluZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmNvbGxhcHNlZDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZvcm1hdCA9IHJlcXVpcmUoJ3V0aWwnKS5mb3JtYXQ7XG52YXIgaW5jbHVkZVBuYW1lID0gdHJ1ZTtcblxuXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgZGVwdGgpIHtcbiAgY29uc29sZS5lcnJvcihyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChvYmosIGZhbHNlLCBkZXB0aCB8fCA1LCB0cnVlKSk7XG59XG5cbmZ1bmN0aW9uIFBlcmZDb2xsYXBzZXIob3B0cykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGVyZkNvbGxhcHNlcikpIHJldHVybiBuZXcgUGVyZkNvbGxhcHNlcihvcHRzKTtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgdGhpcy5pbmNsdWRlUG5hbWUgPSB0eXBlb2Ygb3B0cy5pbmNsdWRlUG5hbWUgPT09ICd1bmRlZmluZWQnID8gdHJ1ZSA6IG9wdHMuaW5jbHVkZVBuYW1lXG4gIHRoaXMuc3RhY2sgPSB1bmRlZmluZWQ7XG4gIHRoaXMucG5hbWUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuY29sbGFwc2VkID0ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGVyZkNvbGxhcHNlcjtcblxudmFyIHByb3RvID0gUGVyZkNvbGxhcHNlci5wcm90b3R5cGU7XG5cbnByb3RvLnJlbWVtYmVyU3RhY2sgPSBmdW5jdGlvbiByZW1lbWJlclN0YWNrKGpvaW5lZFN0YWNrLCBjb3VudCkge1xuICBpZiAoIXRoaXMuY29sbGFwc2VkW2pvaW5lZFN0YWNrXSkgdGhpcy5jb2xsYXBzZWRbam9pbmVkU3RhY2tdID0gMDtcbiAgdGhpcy5jb2xsYXBzZWRbam9pbmVkU3RhY2tdICs9IGNvdW50O1xufVxuXG5wcm90by51bnNoaWZ0U3RhY2sgPSBmdW5jdGlvbiB1bnNoaWZ0U3RhY2sodmFsKSB7XG4gIGlmICghdGhpcy5zdGFjaykgdGhpcy5zdGFjayA9IFsgdmFsIF07XG4gIGVsc2UgdGhpcy5zdGFjay51bnNoaWZ0KHZhbCk7XG59XG5cbnByb3RvLmNvbGxhcHNlTGluZSA9IGZ1bmN0aW9uIHBlcmZDb2xsYXBzZUxpbmUobGluZSkge1xuICB2YXIgZnVuYywgbW9kO1xuXG4gIC8vIGlnbm9yZSBjb21tZW50c1xuICBpZiAoL14jLy50ZXN0KGxpbmUpKSByZXR1cm47XG5cbiAgLy8gZW1wdHkgbGluZXNcbiAgaWYgKCFsaW5lLmxlbmd0aCkge1xuICAgIGlmICh0aGlzLnBuYW1lKSB0aGlzLnVuc2hpZnRTdGFjayh0aGlzLnBuYW1lKTtcbiAgICBpZiAodGhpcy5zdGFjaykgdGhpcy5yZW1lbWJlclN0YWNrKHRoaXMuc3RhY2suam9pbignOycpLCAxKTtcbiAgICB0aGlzLnN0YWNrID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucG5hbWUgPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gbGluZXMgY29udGFpbmluZyBwcm9jZXNzIG5hbWVcbiAgdmFyIG1hdGNoZXMgPSBsaW5lLm1hdGNoKC9eKFxcUyspXFxzLyk7XG4gIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoKSB7XG4gICAgaWYgKHRoaXMuaW5jbHVkZVBuYW1lKSB0aGlzLnBuYW1lID0gbWF0Y2hlc1sxXTtcbiAgICByZXR1cm47XG4gIH1cblxuICBtYXRjaGVzID0gbGluZS5tYXRjaCgvXlxccypcXHcrXFxzKiguKykgKFxcUyspLyk7XG4gIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoKSB7XG4gICAgZnVuYyA9IG1hdGNoZXNbMV07XG4gICAgXG4gICAgLy8gc2tpcCBwcm9jZXNzIG5hbWVzXG4gICAgaWYgKCgvXlxcKC8pLnRlc3QoZnVuYykpIHJldHVybjsgXG5cbiAgICB0aGlzLnVuc2hpZnRTdGFjayhmdW5jKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zb2xlLndhcm4oJ1VucmVjb2duaXplZCBsaW5lOiBcIiVzXCInLCBsaW5lKTtcbn1cblxucHJvdG8uY29sbGFwc2VkTGluZXMgPSBmdW5jdGlvbiBjb2xsYXBzZWRMaW5lcygpIHtcbiAgdmFyIGNvbGxhcHNlZCA9IHRoaXMuY29sbGFwc2VkO1xuICByZXR1cm4gT2JqZWN0LmtleXMoY29sbGFwc2VkKVxuICAgIC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhIDwgYiA/IC0xIDogMSB9KVxuICAgIC5tYXAoZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBmb3JtYXQoJyVzICVzJywgaywgY29sbGFwc2VkW2tdKTtcbiAgICB9KVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZm9ybWF0ID0gcmVxdWlyZSgndXRpbCcpLmZvcm1hdDtcblxuZnVuY3Rpb24gc2NhbGFyUmV2ZXJzZShzKSB7XG4gIHJldHVybiBzLnNwbGl0KCcnKS5yZXZlcnNlKCkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIG5hbWVIYXNoKG5hbWUpIHtcblx0Ly8gR2VuZXJhdGUgYSB2ZWN0b3IgaGFzaCBmb3IgdGhlIG5hbWUgc3RyaW5nLCB3ZWlnaHRpbmcgZWFybHkgb3ZlclxuXHQvLyBsYXRlciBjaGFyYWN0ZXJzLiBXZSB3YW50IHRvIHBpY2sgdGhlIHNhbWUgY29sb3JzIGZvciBmdW5jdGlvblxuXHQvLyBuYW1lcyBhY3Jvc3MgZGlmZmVyZW50IGZsYW1lIGdyYXBocy5cblx0dmFyIHZlY3RvciA9IDBcblx0ICAsIHdlaWdodCA9IDFcblx0ICAsIG1heCA9IDFcblx0ICAsIG1vZCA9IDEwXG5cdCAgLCBvcmRcblxuXHQvLyBpZiBtb2R1bGUgbmFtZSBwcmVzZW50LCB0cnVuYyB0byAxc3QgY2hhclxuICBuYW1lID0gbmFtZS5yZXBsYWNlKC8uKC4qPylgLywgJycpO1xuICB2YXIgc3BsaXRzID0gbmFtZS5zcGxpdCgnJyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3BsaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3JkID0gc3BsaXRzW2ldLmNoYXJDb2RlQXQoMCkgJSBtb2Q7XG4gICAgdmVjdG9yICs9IChvcmQgLyAobW9kKysgLSAxKSkgKiB3ZWlnaHQ7XG4gICAgbWF4ICs9IHdlaWdodDtcbiAgICB3ZWlnaHQgKj0gMC43MDtcbiAgICBpZiAobW9kID4gMTIpIGJyZWFrO1xuICB9XG5cdCBcbiAgcmV0dXJuICgxIC0gdmVjdG9yIC8gbWF4KTtcbn1cblxuZnVuY3Rpb24gY29sb3IodHlwZSwgaGFzaCwgbmFtZSkge1xuICB2YXIgdjEsIHYyLCB2MywgciwgZywgYjtcbiAgaWYgKCF0eXBlKSByZXR1cm4gJ3JnYigwLCAwLCAwKSc7XG5cbiAgaWYgKGhhc2gpIHtcbiAgICB2MSA9IG5hbWVIYXNoKG5hbWUpO1xuICAgIHYyID0gdjMgPSBuYW1lSGFzaChzY2FsYXJSZXZlcnNlKG5hbWUpKTtcbiAgfSBlbHNlIHtcblx0XHR2MSA9IE1hdGgucmFuZG9tKCkgKyAxO1xuXHRcdHYyID0gTWF0aC5yYW5kb20oKSArIDE7XG5cdFx0djMgPSBNYXRoLnJhbmRvbSgpICsgMTtcbiAgfVxuXG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAnaG90JzpcbiAgICAgIHIgPSAyMDUgKyBNYXRoLnJvdW5kKDUwICogdjMpO1xuICAgICAgZyA9IDAgKyBNYXRoLnJvdW5kKDIzMCAqIHYxKTtcbiAgICAgIGIgPSAwICsgTWF0aC5yb3VuZCg1NSAqIHYyKTtcbiAgICAgIHJldHVybiBmb3JtYXQoJ3JnYiglcywgJXMsICVzKScsciwgZywgYik7XG4gICAgY2FzZSAnbWVtJzpcbiAgICAgIHIgPSAwO1xuICAgICAgZyA9IDE5MCArIE1hdGgucm91bmQoNTAgKiB2Mik7XG4gICAgICBiID0gMCArIE1hdGgucm91bmQoMjEwICogdjEpO1xuICAgICAgcmV0dXJuIGZvcm1hdCgncmdiKCVzLCAlcywgJXMpJyxyLCBnLCBiKTtcbiAgICBjYXNlICdpbyc6XG4gICAgICByID0gODAgKyBNYXRoLnJvdW5kKDYwICogdjEpO1xuICAgICAgZyA9IHI7XG4gICAgICBiID0gMTkwICsgTWF0aC5yb3VuZCg1NSAqIHYyKTtcbiAgICAgIHJldHVybiBmb3JtYXQoJ3JnYiglcywgJXMsICVzKScsciwgZywgYik7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biB0eXBlICcgKyB0eXBlKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFxuXG4vKipcbiAqIE1hcHMgYSBmdW5jdGlvbiBuYW1lIHRvIGEgY29sb3IsIHdoaWxlIHRyeWluZyB0byBjcmVhdGUgc2FtZSBjb2xvcnMgZm9yIHNpbWlsYXIgZnVuY3Rpb25zLlxuICogXG4gKiBAbmFtZSBjb2xvck1hcFxuICogQGZ1bmN0aW9uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywgc3RyaW5nPn0gcGFsZXR0ZU1hcCBjdXJyZW50IG1hcCBvZiBjb2xvcnMgYGZ1bmM6IGNvbG9yYFxuICogQHBhcmFtIHtzdHJpbmd9IGNvbG9yVGhlbWUgdGhlbWUgb2YgY29sb3JzIHRvIGJlIHVzZWQgYGhvdCB8IG1lbSB8IGlvYFxuICogQHBhcmFtIHtib29sZWFufSBoYXNoIGlmIHRydWUgY29sb3JzIHdpbGwgYmUgY3JlYXRlZCBmcm9tIG5hbWUgaGFzaCwgb3RoZXJ3aXNlIHRoZXkgYXJlIHJhbmRvbVxuICogQHBhcmFtIHtzdHJpbmd9IGZ1bmMgdGhlIGZ1bmN0aW9uIG5hbWUgZm9yIHdoaWNoIHRvIHNlbGVjdCBhIGNvbG9yXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGNvbnRhaW5pbmcgYW4gcmdiIGNvbG9yLCBpLmUuIGAncmdiKDEsIDIsIDMpJ2BcbiAqL1xuZnVuY3Rpb24gY29sb3JNYXAocGFsZXR0ZU1hcCwgY29sb3JUaGVtZSwgaGFzaCwgZnVuYykge1xuICBpZiAocGFsZXR0ZU1hcFtmdW5jXSkgcmV0dXJuIHBhbGV0dGVNYXBbZnVuY107XG4gIHBhbGV0dGVNYXBbZnVuY10gPSBjb2xvcihjb2xvclRoZW1lLCBoYXNoLCBmdW5jKTtcbiAgcmV0dXJuIHBhbGV0dGVNYXBbZnVuY107XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcbiAgLCBmb3JtYXQgPSByZXF1aXJlKCd1dGlsJykuZm9ybWF0XG4gICwgY29sb3JNYXAgPSByZXF1aXJlKCcuL2NvbG9yLW1hcCcpXG5cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBkZXB0aCkge1xuICBjb25zb2xlLmVycm9yKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KG9iaiwgZmFsc2UsIGRlcHRoIHx8IDUsIHRydWUpKTtcbn1cblxuZnVuY3Rpb24gb25lRGVjaW1hbCh4KSB7XG4gIHJldHVybiAoTWF0aC5yb3VuZCh4ICogMTApIC8gMTApO1xufVxuXG5mdW5jdGlvbiBodG1sRXNjYXBlKHMpIHtcbiAgcmV0dXJuIHNcbiAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gXG4gIFxuLyoqXG4gKiBFeHRyYWN0cyBhIGNvbnRleHQgb2JqZWN0IGZyb20gdGhlIHBhcnNlZCBjYWxsZ3JhcGggQHNlZSBgc3RhY2twYXJzZS5qc2AuXG4gKiBUaGlzIGNvbnRleHQgY2FuIHRoZW4gYmUgdXNlZCB0byBnZW5lcmF0ZSB0aGUgc3ZnIGZpbGUgdmlhIGEgdGVtcGxhdGUuXG4gKiBcbiAqIEBuYW1lIGNvbnRleHRpZnlcbiAqIEBwcml2YXRlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJzZWQgbm9kZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIG9wdGlvbnMgdGhhdCBhZmZlY3QgdmlzdWFsIGFuZCBob3cgdGhlIG5vZGVzIGFyZSBmaWx0ZXJlZFxuICovXG5mdW5jdGlvbiBjb250ZXh0aWZ5KHBhcnNlZCwgb3B0cykge1xuICB2YXIgdGltZSAgICAgICA9IHBhcnNlZC50aW1lXG4gICAgLCB0aW1lTWF4ICAgID0gb3B0cy50aW1lbWF4XG4gICAgLCB5cGFkVG9wICAgID0gb3B0cy5mb250c2l6ZSAqIDQgICAgICAgICAgIC8vIHBhZCB0b3AsIGluY2x1ZGUgdGl0bGVcbiAgICAsIHlwYWRCb3R0b20gPSBvcHRzLmZvbnRzaXplICogMiArIDEwICAgICAgLy8gcGFkIGJvdHRvbSwgaW5jbHVkZSBsYWJlbHNcbiAgICAsIHhwYWQgICAgICAgPSAxMCAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGFkIGxlZnQgYW5kIHJpZ2h0XG4gICAgLCBkZXB0aE1heCAgID0gMFxuICAgICwgZnJhbWVIZWlnaHQgPSBvcHRzLmZyYW1laGVpZ2h0XG4gICAgLCBwYWxldHRlTWFwID0ge31cblxuICBpZiAodGltZU1heCA8IHRpbWUgJiYgdGltZU1heC90aW1lID4gMC4wMikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1NwZWNpZmllZCB0aW1lbWF4ICVkIGlzIGxlc3MgdGhhbiBhY3R1YWwgdG90YWwgJWQsIHNvIGl0IHdpbGwgYmUgaWdub3JlZCcsIHRpbWVNYXgsIHRpbWUpO1xuICAgIHRpbWVNYXggPSBJbmZpbml0eTtcbiAgfVxuXG4gIHRpbWVNYXggPSBNYXRoLm1pbih0aW1lLCB0aW1lTWF4KTtcblxuICB2YXIgd2lkdGhQZXJUaW1lID0gKG9wdHMuaW1hZ2V3aWR0aCAtIDIgKiB4cGFkKSAvIHRpbWVNYXhcbiAgICAsIG1pbldpZHRoVGltZSA9IG9wdHMubWlud2lkdGggLyB3aWR0aFBlclRpbWVcblxuICBmdW5jdGlvbiBtYXJrTmFycm93QmxvY2tzKG5vZGVzKSB7XG5cbiAgICBmdW5jdGlvbiBtYXJrKGspIHtcbiAgICAgIHZhciB2YWwgPSBwYXJzZWQubm9kZXNba107XG4gICAgICBpZiAodHlwZW9mIHZhbC5zdGltZSAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBzdGFydCBmb3IgJyArIGspO1xuICAgICAgaWYgKCh2YWwuZXRpbWUgLSB2YWwuc3RpbWUpIDwgbWluV2lkdGhUaW1lKSB7XG4gICAgICAgIHZhbC5uYXJyb3cgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhbC5uYXJyb3cgPSBmYWxzZTtcbiAgICAgIGRlcHRoTWF4ID0gTWF0aC5tYXgodmFsLmRlcHRoLCBkZXB0aE1heCk7XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMobm9kZXMpLmZvckVhY2gobWFyayk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NOb2RlKG5vZGUpIHtcbiAgICB2YXIgZnVuYyAgPSBub2RlLmZ1bmNcbiAgICAgICwgZGVwdGggPSBub2RlLmRlcHRoXG4gICAgICAsIGV0aW1lID0gbm9kZS5ldGltZVxuICAgICAgLCBzdGltZSA9IG5vZGUuc3RpbWVcbiAgICAgICwgZmFjdG9yID0gb3B0cy5mYWN0b3JcbiAgICAgICwgY291bnROYW1lID0gb3B0cy5jb3VudG5hbWVcbiAgICAgICwgaXNSb290ID0gIWZ1bmMubGVuZ3RoICYmIGRlcHRoID09PSAwXG4gICAgO1xuXG4gICAgaWYgKGlzUm9vdCkgZXRpbWUgPSB0aW1lTWF4O1xuICAgIFxuICAgIHZhciBzYW1wbGVzID0gTWF0aC5yb3VuZCgoZXRpbWUgLSBzdGltZSAqIGZhY3RvcikgKiAxMCkgLyAxMFxuICAgICAgLCBzYW1wbGVzVHh0ID0gc2FtcGxlcy50b0xvY2FsZVN0cmluZygpXG4gICAgICAsIHBjdFxuICAgICAgLCBwY3RUeHRcbiAgICAgICwgZXNjYXBlZEZ1bmNcbiAgICAgICwgbmFtZVxuICAgICAgLCBzYW1wbGVJbmZvXG5cbiAgICBpZiAoaXNSb290KSB7XG4gICAgICBuYW1lID0gJ2FsbCc7XG4gICAgICBzYW1wbGVJbmZvID0gZm9ybWF0KCcoJXMgJXMsIDEwMCUpJywgc2FtcGxlc1R4dCwgY291bnROYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGN0ID0gTWF0aC5yb3VuZCgoMTAwICogc2FtcGxlcykgLyAodGltZU1heCAqIGZhY3RvcikgKiAxMCkgLyAxMFxuICAgICAgcGN0VHh0ID0gcGN0LnRvTG9jYWxlU3RyaW5nKClcbiAgICAgIGVzY2FwZWRGdW5jID0gaHRtbEVzY2FwZShmdW5jKTtcblxuICAgICAgbmFtZSA9IGVzY2FwZWRGdW5jO1xuICAgICAgc2FtcGxlSW5mbyA9IGZvcm1hdCgnKCVzICVzKSwgJXMlJSknLCBzYW1wbGVzVHh0LCBjb3VudE5hbWUsIHBjdFR4dCk7XG4gICAgfVxuXG4gICAgdmFyIHgxID0gb25lRGVjaW1hbCh4cGFkICsgc3RpbWUgKiB3aWR0aFBlclRpbWUpXG4gICAgICAsIHgyID0gb25lRGVjaW1hbCh4cGFkICsgZXRpbWUgKiB3aWR0aFBlclRpbWUpXG4gICAgICAsIHkxID0gb25lRGVjaW1hbChpbWFnZUhlaWdodCAtIHlwYWRCb3R0b20gLSAoZGVwdGggKyAxKSAqIGZyYW1lSGVpZ2h0ICsgMSlcbiAgICAgICwgeTIgPSBvbmVEZWNpbWFsKGltYWdlSGVpZ2h0IC0geXBhZEJvdHRvbSAtIGRlcHRoICogZnJhbWVIZWlnaHQpXG4gICAgICAsIGNoYXJzID0gKHgyIC0geDEpIC8gKG9wdHMuZm9udHNpemUgKiBvcHRzLmZvbnR3aWR0aClcbiAgICAgICwgc2hvd1RleHQgPSBmYWxzZVxuICAgICAgLCB0ZXh0XG4gICAgICAsIHRleHRfeFxuICAgICAgLCB0ZXh0X3lcblxuICAgIGlmIChjaGFycyA+PSAzICkgeyAvLyBlbm91Z2ggcm9vbSB0byBkaXNwbGF5IGZ1bmN0aW9uIG5hbWU/XG4gICAgICBzaG93VGV4dCA9IHRydWU7XG4gICAgICB0ZXh0ID0gZnVuYy5zbGljZSgwLCBjaGFycyk7XG4gICAgICBpZiAoY2hhcnMgPCBmdW5jLmxlbmd0aCkgdGV4dCA9IHRleHQuc2xpY2UoMCwgY2hhcnMgLSAyKSArICcuLic7XG4gICAgICB0ZXh0ID0gaHRtbEVzY2FwZSh0ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lICAgICAgOiBuYW1lXG4gICAgICAsIHNlYXJjaCAgICA6IG5hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgLCBzYW1wbGVzICAgOiBzYW1wbGVJbmZvXG4gICAgICAsIHJlY3RfeCAgICA6IHgxXG4gICAgICAsIHJlY3RfeSAgICA6IHkxXG4gICAgICAsIHJlY3RfdyAgICA6IHgyIC0geDFcbiAgICAgICwgcmVjdF9oICAgIDogeTIgLSB5MVxuICAgICAgLCByZWN0X2ZpbGwgOiBjb2xvck1hcChwYWxldHRlTWFwLCBvcHRzLmNvbG9ycywgb3B0cy5oYXNoLCBmdW5jKVxuICAgICAgLCB0ZXh0ICAgICAgOiB0ZXh0XG4gICAgICAsIHRleHRfeCAgICA6IHgxICsgKHNob3dUZXh0ID8gMyA6IDApXG4gICAgICAsIHRleHRfeSAgICA6IDMgKyAoeTEgKyB5MikgLyAyXG4gICAgICAsIG5hcnJvdyAgICA6IG5vZGUubmFycm93XG4gICAgICAsIGZ1bmMgICAgICA6IGh0bWxFc2NhcGUoZnVuYylcbiAgICB9XG4gIH1cblxuICBtYXJrTmFycm93QmxvY2tzKHBhcnNlZC5ub2Rlcyk7XG5cbiAgdmFyIGltYWdlSGVpZ2h0ID0gKGRlcHRoTWF4ICogZnJhbWVIZWlnaHQpICsgeXBhZFRvcCArIHlwYWRCb3R0b207XG4gIHZhciBjdHggPSB4dGVuZChvcHRzLCB7XG4gICAgICBpbWFnZWhlaWdodCA6IGltYWdlSGVpZ2h0XG4gICAgLCB4cGFkICAgICAgICA6IHhwYWRcbiAgICAsIHRpdGxlWCAgICAgIDogb3B0cy5pbWFnZXdpZHRoIC8gMlxuICAgICwgZGV0YWlsc1kgICAgOiBpbWFnZUhlaWdodCAtIChmcmFtZUhlaWdodCAvIDIpIFxuICB9KTtcblxuICBjdHgubm9kZXMgPSBPYmplY3Qua2V5cyhwYXJzZWQubm9kZXMpXG4gICAgLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrKSB7XG4gICAgICBhY2MucHVzaChwcm9jZXNzTm9kZShwYXJzZWQubm9kZXNba10pKTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgW10pO1xuICByZXR1cm4gY3R4O1xufSBcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZm9udHR5cGUgICAgOiB7IHR5cGUgOiAnc3RyaW5nJyAgLCBkZXNjcmlwdGlvbiA6ICdGb250IFR5cGUnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGZvbnRzaXplICAgIDogeyB0eXBlIDogJ3JhbmdlJyAgICwgZGVzY3JpcHRpb24gOiAnRm9udCBTaXplJyAgLCBtaW46IDYsIG1heDogMjIsIHN0ZXA6IDAuMSAgICAgICAgIH1cbiAgLCBpbWFnZXdpZHRoICA6IHsgdHlwZSA6ICdyYW5nZScgICwgZGVzY3JpcHRpb24gOiAnSW1hZ2UgV2lkdGgnICwgbWluOiAyMDAsIG1heDogMjQwMCwgc3RlcDogNSAgICAgICB9XG4gICwgZnJhbWVoZWlnaHQgOiB7IHR5cGUgOiAncmFuZ2UnICAsIGRlc2NyaXB0aW9uIDogJ0ZyYW1lIEhlaWdodCcsIG1pbjogNiwgbWF4OiA0MCwgc3RlcDogMC4xICAgICAgICAgfVxuICAsIGZvbnR3aWR0aCAgIDogeyB0eXBlIDogJ3JhbmdlJyAgLCBkZXNjcmlwdGlvbiA6ICdGb250IFdpZHRoJywgbWluOiAwLjIsIG1heDogMS4wLCBzdGVwOiAwLjA1ICAgICAgIH1cbiAgLCBtaW53aWR0aCAgICA6IHsgdHlwZSA6ICdyYW5nZScgICwgZGVzY3JpcHRpb24gOiAnTWluIEZ1bmN0aW9uIFdpZHRoJywgbWluOiAwLjEsIG1heDogMzAsIHN0ZXA6IDAuMSB9XG4gICwgY291bnRuYW1lICAgOiB7IHR5cGUgOiAnc3RyaW5nJyAgLCBkZXNjcmlwdGlvbiA6ICdDb3VudCBOYW1lJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIGNvbG9ycyAgICAgIDogeyB0eXBlIDogJ3N0cmluZycgICwgZGVzY3JpcHRpb24gOiAnQ29sb3IgVGhlbWUnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBiZ2NvbG9yMSAgICA6IHsgdHlwZSA6ICdjb2xvcicgICAsIGRlc2NyaXB0aW9uIDogJ0dyYWRpZW50IHN0YXJ0JyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgYmdjb2xvcjIgICAgOiB7IHR5cGUgOiAnY29sb3InICAgLCBkZXNjcmlwdGlvbiA6ICdHcmFkaWVudCBzdG9wJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIHRpbWVtYXggICAgIDogeyB0eXBlIDogJ251bWJlcicgICwgZGVzY3JpcHRpb24gOiAnVGltZSBNYXgnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBmYWN0b3IgICAgICA6IHsgdHlwZSA6ICdudW1iZXInICAsIGRlc2NyaXB0aW9uIDogJ1NjYWxpbmcgRmFjdG9yJyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgaGFzaCAgICAgICAgOiB7IHR5cGUgOiAnYm9vbGVhbicgLCBkZXNjcmlwdGlvbiA6ICdDb2xvciBieSBGdW5jdGlvbiBOYW1lJyAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAsIHRpdGxlc3RyaW5nIDogeyB0eXBlIDogJ3N0cmluZycgICwgZGVzY3JpcHRpb24gOiAnVGl0bGUnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgLCBuYW1ldHlwZSAgICA6IHsgdHlwZSA6ICdzdHJpbmcnICAsIGRlc2NyaXB0aW9uIDogJ05hbWUnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICwgaW50ZXJuYWxzOiB7IHR5cGU6ICdjaGVja2JveCcgLCBkZXNjcmlwdGlvbjogJ1Nob3cgSW50ZXJuYWxzJywgY2hlY2tlZDogJycgfVxuICAsIG9wdGltaXphdGlvbmluZm86IHsgdHlwZTogJ2NoZWNrYm94JyAsIGRlc2NyaXB0aW9uOiAnU2hvdyBPcHRpbWl6YXRpb24gSW5mbycsIGNoZWNrZWQ6ICcnIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZm9udHR5cGUgICAgOiAnVmVyZGFuYScgICAgIC8vIGZvbnQgdHlwZVxuICAsIGZvbnRzaXplICAgIDogMTIgICAgICAgICAgICAvLyBiYXNlIHRleHQgc2l6ZVxuICAsIGltYWdld2lkdGggIDogMTIwMCAgICAgICAgICAvLyBtYXggd2lkdGgsIHBpeGVsc1xuICAsIGZyYW1laGVpZ2h0IDogMTYuMCAgICAgICAgICAvLyBtYXggaGVpZ2h0IGlzIGR5bmFtaWMgIFxuICAsIGZvbnR3aWR0aCAgIDogMC41OSAgICAgICAgICAvLyBhdmcgd2lkdGggcmVsYXRpdmUgdG8gZm9udHNpemVcbiAgLCBtaW53aWR0aCAgICA6IDAuMSAgICAgICAgICAgLy8gbWluIGZ1bmN0aW9uIHdpZHRoLCBwaXhlbHNcbiAgLCBjb3VudG5hbWUgICA6ICdzYW1wbGVzJyAgICAgLy8gd2hhdCBhcmUgdGhlIGNvdW50cyBpbiB0aGUgZGF0YT9cbiAgLCBjb2xvcnMgICAgICA6ICdob3QnICAgICAgICAgLy8gY29sb3IgdGhlbWVcbiAgLCBiZ2NvbG9yMSAgICA6ICcjZWVlZWVlJyAgICAgLy8gYmFja2dyb3VuZCBjb2xvciBncmFkaWVudCBzdGFydFxuICAsIGJnY29sb3IyICAgIDogJyNlZWVlYjAnICAgICAvLyBiYWNrZ3JvdW5kIGNvbG9yIGdyYWRpZW50IHN0b3BcbiAgLCB0aW1lbWF4ICAgICA6IEluZmluaXR5ICAgICAgLy8gKG92ZXJyaWRlIHRoZSkgc3VtIG9mIHRoZSBjb3VudHNcbiAgLCBmYWN0b3IgICAgICA6IDEgICAgICAgICAgICAgLy8gZmFjdG9yIHRvIHNjYWxlIGNvdW50cyBieVxuICAsIGhhc2ggICAgICAgIDogdHJ1ZSAgICAgICAgICAvLyBjb2xvciBieSBmdW5jdGlvbiBuYW1lXG4gICwgdGl0bGV0ZXh0ICAgOiAnRmxhbWUgR3JhcGgnIC8vIGNlbnRlcmVkIGhlYWRpbmdcbiAgLCBuYW1ldHlwZSAgICA6ICdGdW5jdGlvbjonICAgLy8gd2hhdCBhcmUgdGhlIG5hbWVzIGluIHRoZSBkYXRhP1xuXG4gIC8vIGJlbG93IGFyZSBub3Qgc3VwcG9ydGVkIGF0IHRoaXMgcG9pbnRcbiAgLCBwYWxldHRlICAgICA6IGZhbHNlICAgICAgICAgLy8gaWYgd2UgdXNlIGNvbnNpc3RlbnQgcGFsZXR0ZXMgKGRlZmF1bHQgb2ZmKVxuICAsIHBhbGV0dGVfbWFwIDoge30gICAgICAgICAgICAvLyBwYWxldHRlIG1hcCBoYXNoXG4gICwgcGFsX2ZpbGUgICAgOiAncGFsZXR0ZS5tYXAnIC8vIHBhbGV0dGUgbWFwIGZpbGUgbmFtZVxuXG4gICwgcmVtb3ZlbmFycm93cyA6IHRydWUgICAgICAgIC8vIHJlbW92ZXMgbmFycm93IGZ1bmN0aW9ucyBpbnN0ZWFkIG9mIGFkZGluZyBhICdoaWRkZW4nIGNsYXNzXG4gIFxuICAsIGludGVybmFsczogZmFsc2VcbiAgLCBvcHRpbWl6YXRpb25pbmZvOiBmYWxzZVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5zdHJ1bWVudHNSZWdleCA9IC9eUnVubmluZyBUaW1lLCAqU2VsZiwuKiwgKlN5bWJvbCBOYW1lLztcblxuLy8gbm9kZSAyMjYxMCAxMzEwOC4yMTEwMzg6IGNwdS1jbG9jazp1OiBcbnZhciBwZXJmUmVnZXggPSAvXlxcdysgK1xcZCsgK1xcZCtcXC5cXGQrOi87XG5cbi8vIGNwdXByb2ZpbGUgaXMgSlNPTlxudmFyIGNwdXByb2ZpbGVSZWdleCA9IC9eXFxzKj97LztcblxuZnVuY3Rpb24gZmlyc3RMaW5lKGFycikge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgIC8vIGlnbm9yZSBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHMgc3RhcnRpbmcgd2l0aCAjXG4gICAgaWYgKGFycltpXSAmJiBhcnJbaV0ubGVuZ3RoICYmIGFycltpXVswXSAhPT0gJyMnKSByZXR1cm4gYXJyW2ldO1xuICB9XG59XG5cbnZhciBnbyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGV0ZWN0SW5wdXRUeXBlKGFycikge1xuICB2YXIgZmlyc3QgPSBmaXJzdExpbmUoYXJyKTtcbiAgaWYgKCFmaXJzdCkgcmV0dXJuIG51bGw7XG5cbiAgaWYgKGluc3RydW1lbnRzUmVnZXgudGVzdChmaXJzdCkpIHJldHVybiAnaW5zdHJ1bWVudHMnO1xuICBpZiAocGVyZlJlZ2V4LnRlc3QoZmlyc3QpKSByZXR1cm4gJ3BlcmYnO1xuICBpZiAoY3B1cHJvZmlsZVJlZ2V4LnRlc3QoZmlyc3QpKSByZXR1cm4gJ2NwdXByb2ZpbGUnOyBcblxuICByZXR1cm4gbnVsbDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHY4SW50ZXJuYWxzID1cbiAgICAnX19saWJjX3N0YXJ0fG5vZGU6OlN0YXJ0XFxcXCgnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub2RlIHN0YXJ0dXBcbiAgKyAnfHY4OjppbnRlcm5hbDo6fHY4OjpGdW5jdGlvbjo6Q2FsbHx2ODo6RnVuY3Rpb246Ok5ld0luc3RhbmNlJyAgICAgICAgICAgICAgICAgICAgLy8gdjggaW50ZXJuYWwgQysrXG4gICsgJ3xCdWlsdGluOnxTdHViOnxTdG9yZUlDOnxMb2FkSUM6fExvYWRQb2x5bW9ycGhpY0lDOnxLZXllZExvYWRJQzonICAgICAgICAgICAgICAgIC8vIHY4IGdlbmVyYXRlZCBib2lsZXJwbGF0ZSBcbiAgKyAnfDxVbmtub3duIEFkZHJlc3M+fF9wbGF0Zm9ybV9cXFxcdytcXFxcJFZBUklBTlRcXFxcJHxEWUxELVNUVUJcXFxcJHxfb3NfbG9ja19zcGluX2xvY2snICAvLyB1bmtub3duIGFuZCBsb3dlciBsZXZlbCB0aGluZ3NcblxudmFyIHVucmVzb2x2ZWRzID0gLzsweFswLTlBLUZhLWZdezIsMTJ9L2cgLy8gbG9uZWx5IHVucmVzb2x2ZWQgaGV4IGFkZHJlc3NcblxudmFyIG1pZEhlYWQgID0gJygnXG4gICwgbWlkVGFpbCAgPSAnKVteO10rOydcbiAgLCBsYXN0SGVhZCA9ICcoLis/KTsoKD86J1xuICAsIGxhc3RUYWlsID0gJylbXjtdKz8pKCBcXFxcZCskKSdcblxudmFyIHY4TWlkUmVnZXggPSBuZXcgUmVnRXhwKG1pZEhlYWQgKyB2OEludGVybmFscyArIG1pZFRhaWwsICdnJylcbiAgLCB2OExhc3RSZWdleCA9IG5ldyBSZWdFeHAobGFzdEhlYWQgKyB2OEludGVybmFscyArIGxhc3RUYWlsKVxuXG5mdW5jdGlvbiBmaWx0ZXJMaW5lKGwpIHtcbiAgcmV0dXJuIGxcbiAgICAucmVwbGFjZSh1bnJlc29sdmVkcywgJycpXG4gICAgLy8ganVzdCByZW1vdmUgbWF0Y2hlcyBpbiBiZXR3ZWVuIHR3byBzZW1pY29sb25zLCBpLmUuOiA7IC4uIDtcbiAgICAucmVwbGFjZSh2OE1pZFJlZ2V4LCAnJylcbiAgICAvLyBpZiBpdCdzIHRoZSBsYXN0IGZ1bmN0aW9uIGluIHRoZSBzdGFjayByZW1vdmFsIGlzIGEgYml0IGRpZmZlcmVudCBzaW5jZSB3ZSBubyA7IGRlbGltaXRzIHRoZSBlbmRcbiAgICAvLyBpdCdzIHByb2JhYmx5IHBvc3NpYmxlIHRvIGhhbmRsZSBib3RoIGNhc2VzIHdpdGggb25lIHJlZ2V4IGFuZCBzcGVlZCB0aGluZ3MgdXBcbiAgICAvLyBpbiB0aGUgcHJvY2VzcywgYnV0IHRoaXMgd2lsbCB3b3JrIGZvciBub3dcbiAgICAucmVwbGFjZSh2OExhc3RSZWdleCwgZnVuY3Rpb24gcmVwbGFjZUludGVybmFscyhtYXRjaCwgYmVmb3JlLCByZW1vdmUsIGFmdGVyKSB7XG4gICAgICByZXR1cm4gYmVmb3JlICsgYWZ0ZXI7XG4gICAgfSlcbn1cblxudmFyIGdvID0gbW9kdWxlLmV4cG9ydHMgPSBcblxuLyoqXG4gKiBGaWx0ZXJzIGludGVybmFsIGZ1bmN0aW9ucyBmcm9tIHRoZSBnaXZlbiBjb2xsYXBzZWQgc3RhY2suXG4gKlxuICogTk9URTogbm8gYWN0dWFsIGxpbmVzIGFyZSByZW1vdmVkLCBpbnN0ZWFkIHRoZXkgYXJlIG1vZGlmaWVkIHRvIHJlbW92ZSB0aGUgaW50ZXJuYWwgZnVuY3Rpb25zLlxuICogXG4gKiBAbmFtZSBmaWx0ZXJJbnRlcm5hbHNcbiAqIEBwcml2YXRlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGNvbGxhcHNlZCBjYWxsZ3JhcGggZGF0YSB0aGF0IGhhcyBiZWVuIGNvbGxhcHNlZFxuICogQHJldHVybiB7QXJyYXkuPFN0cmluZz59IGNvbGxhcHNlZCBjYWxsZ3JhcGggZGF0YSB3aXRoIGludGVybmFsIGZ1bmN0aW9ucyByZW1vdmVkXG4gKi9cbmZ1bmN0aW9uIGZpbHRlckludGVybmFscyhjb2xsYXBzZWQpIHtcbiAgcmV0dXJuIGNvbGxhcHNlZC5tYXAoZmlsdGVyTGluZSk7ICBcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHY4TGF6eUNvbXBpbGVSZWdleCA9IC9MYXp5Q29tcGlsZTovZ1xudmFyIHY4TGF6eUNvbXBpbGVJbmxpbmVJbmZvUmVnZXggPSAvTGF6eUNvbXBpbGU6W34qXXswLDF9L2dcblxudmFyIGdvID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmaWx0ZXJMYXp5Q29tcGlsZShjb2xsYXBzZWQsIG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciB2OExhenlSZWdleCA9IG9wdHMub3B0aW1pemF0aW9uaW5mbyA/IHY4TGF6eUNvbXBpbGVSZWdleCA6IHY4TGF6eUNvbXBpbGVJbmxpbmVJbmZvUmVnZXg7XG4gIHZhciB2OExhenlSZXBsYWNlbWVudCA9IG9wdHMub3B0aW1pemF0aW9uaW5mbyA/ICcnIDogJy0nO1xuXG4gIGZ1bmN0aW9uIGZpbHRlckxpbmUobCkge1xuICAgIHJldHVybiBsLnJlcGxhY2UodjhMYXp5UmVnZXgsIHY4TGF6eVJlcGxhY2VtZW50KVxuICB9XG5cbiAgcmV0dXJuIGNvbGxhcHNlZC5tYXAoZmlsdGVyTGluZSk7ICBcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGluc3RydW1lbnRzID0gcmVxdWlyZSgnLi9jb2xsYXBzZS1pbnN0cnVtZW50cycpXG4gICwgcGVyZiA9IHJlcXVpcmUoJy4vY29sbGFwc2UtcGVyZicpXG4gICwgY3B1cHJvZmlsZSA9IHJlcXVpcmUoJy4vY29sbGFwc2UtY3B1cHJvZmlsZScpXG5cbmZ1bmN0aW9uIGdldENvbGxhcHNlcih0eXBlKSB7XG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAnaW5zdHJ1bWVudHMnOlxuICAgICAgcmV0dXJuIGluc3RydW1lbnRzKClcbiAgICBjYXNlICdwZXJmJzpcbiAgICAgIHJldHVybiBwZXJmKClcbiAgICBjYXNlICdjcHVwcm9maWxlJzpcbiAgICAgIHJldHVybiBjcHVwcm9maWxlKClcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHR5cGUsIGNhbm5vdCBjb2xsYXBzZSBcIicgKyB0eXBlICsgJ1wiJyk7IFxuICB9XG59XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFxuXG4vKipcbiAqIENvbGxhcHNlcyBhIGNhbGxncmFwaCBpbnNpZGUgYSBnaXZlbiBsaW5lcyBhcnJheSBsaW5lIGJ5IGxpbmUuXG4gKiBcbiAqIEBuYW1lIGZsYW1lZ3JhcGg6OnN0YWNrQ29sbGFwc2UuYXJyYXlcbiAqIEBwcml2YXRlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoZSB0eXBlIG9mIGlucHV0IHRvIGNvbGxhcHNlXG4gKiBAcGFyYW0ge0FycmF5LjxzdHJpbmc+fSBhcnIgbGluZXMgdG8gY29sbGFwc2VcbiAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBhcnJheSBvZiBjb2xsYXBzZWQgbGluZXNcbiAqL1xuZnVuY3Rpb24gc3RhY2tDb2xsYXBzZSh0eXBlLCBhcnIpIHtcbiAgdmFyIGNvbGxhcHNlciA9IGdldENvbGxhcHNlcih0eXBlKTtcbiAgXG4gIGlmICh0eXBlb2YgY29sbGFwc2VyLmNvbGxhcHNlQXJyYXkgPT09ICdmdW5jdGlvbicpIHJldHVybiBjb2xsYXBzZXIuY29sbGFwc2VBcnJheShhcnIpO1xuXG4gIGZ1bmN0aW9uIG9ubGluZSAobGluZSkge1xuICAgIGNvbGxhcHNlci5jb2xsYXBzZUxpbmUobGluZSk7XG4gIH1cblxuICBmdW5jdGlvbiBub25FbXB0eShsaW5lKSB7XG4gICAgcmV0dXJuIGxpbmUgJiYgbGluZS5sZW5ndGg7XG4gIH1cblxuICBhcnIuZm9yRWFjaChvbmxpbmUpO1xuXG4gIHJldHVybiBjb2xsYXBzZXIuY29sbGFwc2VkTGluZXMoKS5maWx0ZXIobm9uRW1wdHkpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVnZXhwID0gL14oLiopXFxzKyhcXGQrKD86XFwuXFxkKik/KSQvO1xuXG5mdW5jdGlvbiBsZXhpY2FsbHkoYSwgYikge1xuICByZXR1cm4gIGEgPCBiID8gLTEgXG4gICAgICAgIDogYiA8IGEgPyAgMSA6IDA7XG59XG5cbmZ1bmN0aW9uIHNvcnQoZnVuY3Rpb25zKSB7XG4gIHJldHVybiBmdW5jdGlvbnMuc29ydChsZXhpY2FsbHkpO1xufVxuXG5mdW5jdGlvbiBmbG93KHRtcCwgbm9kZXMsIGxhc3QsIGZyYW1lcywgdGltZSkge1xuXG4gIHZhciBsZW5MYXN0ID0gbGFzdC5sZW5ndGggLSAxXG4gICAgLCBsZW5GcmFtZXMgPSBmcmFtZXMubGVuZ3RoIC0gMVxuICAgICwgaVxuICAgICwgbGVuU2FtZVxuICAgICwga1xuXG4gIGZvcihpID0gMDsgaSA8PSBsZW5MYXN0OyBpKyspIHtcbiAgICBpZiAoaSA+IGxlbkZyYW1lcykgYnJlYWs7XG4gICAgaWYgKGxhc3RbaV0gIT09IGZyYW1lc1tpXSkgYnJlYWs7XG4gIH1cbiAgbGVuU2FtZSA9IGk7XG5cbiAgZm9yKGkgPSBsZW5MYXN0OyBpID49IGxlblNhbWU7IGktLSkge1xuICAgIGsgPSBsYXN0W2ldICsgJzsnICsgaTtcblx0XHQvLyBhIHVuaXF1ZSBJRCBpcyBjb25zdHJ1Y3RlZCBmcm9tIFwiZnVuYztkZXB0aDtldGltZVwiO1xuXHRcdC8vIGZ1bmMtZGVwdGggaXNuJ3QgdW5pcXVlLCBpdCBtYXkgYmUgcmVwZWF0ZWQgbGF0ZXIuXG4gICAgbm9kZXNbayArICc7JyArIHRpbWVdID0geyBmdW5jOiBsYXN0W2ldLCBkZXB0aDogaSwgZXRpbWU6IHRpbWUsIHN0aW1lOiB0bXBba10uc3RpbWUgfVxuICAgIHRtcFtrXSA9IG51bGw7XG4gIH1cblxuICBmb3IoaSA9IGxlblNhbWU7IGkgPD0gbGVuRnJhbWVzOyBpKyspIHtcbiAgICBrID0gZnJhbWVzW2ldKyAnOycgKyBpO1xuICAgIHRtcFtrXSA9IHsgc3RpbWU6IHRpbWUgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cmltTGluZShsaW5lKSB7XG4gIHJldHVybiBsaW5lLnRyaW0oKTtcbn1cblxuZnVuY3Rpb24gbm9uZW1wdHkobGluZSkge1xuICByZXR1cm4gbGluZS5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gXG5cbi8qKlxuICogUGFyc2VzIGNvbGxhcHNlZCBsaW5lcyBpbnRvIGEgbm9kZXMgYXJyYXkuXG4gKiBcbiAqIEBuYW1lIHBhcnNlSW5wdXRcbiAqIEBwcml2YXRlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXkuPHN0cmluZz59IGxpbmVzIGNvbGxhcHNlZCBjYWxsZ3JhcGhcbiAqIEByZXR1cm4ge09iamVjdH0gIFxuICogIC0gbm9kZXM6IGFycmF5IG9mIG5vZGVzLCBvbmUgZm9yIGVhY2ggbGluZSBcbiAqICAtIHRpbWU6IHRvdGFsIGV4ZWN1dGlvbiB0aW1lXG4gKiAgLSBpZ25vcmVkOiBob3cgbWFueSBsaW5lcyB3aGVyZSBpZ25vcmVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSW5wdXQobGluZXMpIHtcbiAgdmFyIGlnbm9yZWQgPSAwXG4gICAgLCB0aW1lID0gMFxuICAgICwgbGFzdCA9IFtdXG4gICAgLCB0bXAgPSB7fVxuICAgICwgbm9kZXMgPSB7fVxuICAgIDtcblxuICBmdW5jdGlvbiBwcm9jZXNzTGluZShsaW5lKSB7XG4gICAgdmFyIGZyYW1lcztcblxuICAgIHZhciBtYXRjaGVzID0gbGluZS5tYXRjaChyZWdleHApO1xuICAgIGlmICghbWF0Y2hlcyB8fCAhbWF0Y2hlcy5sZW5ndGgpIHJldHVybjtcblxuICAgIHZhciBzdGFjayAgID0gbWF0Y2hlc1sxXTtcbiAgICB2YXIgc2FtcGxlcyA9IG1hdGNoZXNbMl07XG5cbiAgICBpZiAoIXNhbXBsZXMpIHtcbiAgICAgIGlnbm9yZWQrKztcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzdGFjayA9IHN0YWNrLnJlcGxhY2UoLzw+L2csICcoKScpO1xuICAgIGZyYW1lcyA9IHN0YWNrLnNwbGl0KCc7Jyk7XG5cbiAgICBmbG93KHRtcCwgbm9kZXMsIGxhc3QsIGZyYW1lcywgdGltZSk7XG4gICAgdGltZSArPSBwYXJzZUludChzYW1wbGVzLCAxMCk7XG5cbiAgICBsYXN0ID0gZnJhbWVzO1xuICB9XG5cbiAgc29ydChcbiAgICBsaW5lc1xuICAgICAgLm1hcCh0cmltTGluZSlcbiAgICAgIC5maWx0ZXIobm9uZW1wdHkpXG4gICAgKVxuICAgIC5mb3JFYWNoKHByb2Nlc3NMaW5lKTtcblxuICBmbG93KHRtcCwgbm9kZXMsIGxhc3QsIFtdLCB0aW1lKTtcblxuICBpZiAoaWdub3JlZCkgY29uc29sZS5lcnJvcignSWdub3JlZCAlZCBsaW5lcyB3aXRoIGludmFsaWQgZm9ybWF0Jyk7XG4gIGlmICghdGltZSkgdGhyb3cgbmV3IEVycm9yKCdObyBzdGFjayBjb3VudHMgZm91bmQhJyk7XG5cbiAgcmV0dXJuIHsgbm9kZXM6IG5vZGVzLCB0aW1lOiB0aW1lLCBpZ25vcmVkOiBpZ25vcmVkIH07XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gcmVzb2x2ZWQgdmlhIGhic2Z5IHRyYW5zZm9ybVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3ZnLmhicycpO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEsZGVwdGhzKSB7XG4gIHZhciBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBsYW1iZGE9dGhpcy5sYW1iZGEsIGJ1ZmZlciA9IFwiPGcgY2xhc3M9XFxcImZ1bmNfZyBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzWydjbGFzcyddIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMFsnY2xhc3MnXSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJjbGFzc1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG9ubW91c2VvdmVyPVxcXCJzKCdcIjtcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnNhbXBsZXMgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNhbXBsZXMgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic2FtcGxlc1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCInKVxcXCIgb25tb3VzZW91dD1cXFwiYygpXFxcIiBkYXRhLXNlYXJjaD1cXFwiXCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuc2VhcmNoIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zZWFyY2ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic2VhcmNoXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgZGF0YS1mdW5jbmFtZT1cXFwiXCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZnVuYyB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZnVuYyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJmdW5jXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICA8dGl0bGU+XCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5zYW1wbGVzIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zYW1wbGVzIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInNhbXBsZXNcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC90aXRsZT5cXG4gIDxyZWN0IHg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF94IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X3ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF94XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZGF0YS14PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJlY3RfeCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmVjdF94IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInJlY3RfeFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF95IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X3kgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF95XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgd2lkdGg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF93IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X3cgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF93XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZGF0YS13aWR0aD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWN0X3cgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJlY3RfdyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJyZWN0X3dcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBoZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF9oIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X2ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF9oXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZGF0YS1oZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucmVjdF9oIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWN0X2ggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwicmVjdF9oXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWN0X2ZpbGwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJlY3RfZmlsbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJyZWN0X2ZpbGxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiByeD1cXFwiMlxcXCIgcnk9XFxcIjJcXFwiPjwvcmVjdD5cXG4gIDx0ZXh0IGRhdGEteD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50ZXh0X3ggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRleHRfeCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ0ZXh0X3hcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiB4PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnRleHRfeCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGV4dF94IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRleHRfeFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGV4dF95IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50ZXh0X3kgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidGV4dF95XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZm9udC1zaXplPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbihsYW1iZGEoKGRlcHRoc1sxXSAhPSBudWxsID8gZGVwdGhzWzFdLmZvbnRzaXplIDogZGVwdGhzWzFdKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIiBmb250LWZhbWlseT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24obGFtYmRhKChkZXB0aHNbMV0gIT0gbnVsbCA/IGRlcHRoc1sxXS5mb250dHlwZSA6IGRlcHRoc1sxXSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwicmdiKDAsMCwwKVxcXCI+XCI7XG4gIHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGV4dCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGV4dCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ0ZXh0XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSk7XG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIHJldHVybiBidWZmZXIgKyBcIjwvdGV4dD5cXG48L2c+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhLGRlcHRocykge1xuICB2YXIgc3RhY2sxLCBoZWxwZXIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGhlbHBlck1pc3Npbmc9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgYnVmZmVyID0gXCI8P3htbCB2ZXJzaW9uPVxcXCIxLjBcXFwiIHN0YW5kYWxvbmU9XFxcIm5vXFxcIj8+XFxuPCFET0NUWVBFIHN2ZyBQVUJMSUMgXFxcIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOXFxcIiBcXFwiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkXFxcIj5cXG5cXG48c3ZnIHZlcnNpb249XFxcIjEuMVxcXCIgaWQ9XFxcImZsYW1lZ3JhcGgtc3ZnXFxcIiBcXG4gIGRhdGEtd2lkdGg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2V3aWR0aCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2V3aWR0aCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJpbWFnZXdpZHRoXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgd2lkdGg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2V3aWR0aCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2V3aWR0aCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJpbWFnZXdpZHRoXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgXFxuICBoZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2VoZWlnaHQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdlaGVpZ2h0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImltYWdlaGVpZ2h0XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZGF0YS1oZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2VoZWlnaHQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdlaGVpZ2h0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImltYWdlaGVpZ2h0XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCJcXG4gIG9ubG9hZD1cXFwiaW5pdChldnQpXFxcIiBcXG4gIHZpZXdCb3g9XFxcIjAgMCBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmltYWdld2lkdGggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdld2lkdGggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2V3aWR0aFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCIgXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWFnZWhlaWdodCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaW1hZ2VoZWlnaHQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaW1hZ2VoZWlnaHRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBcXG4gIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcblxcbjxkZWZzPlxcblx0PGxpbmVhckdyYWRpZW50IGlkPVxcXCJiYWNrZ3JvdW5kXFxcIiB5MT1cXFwiMFxcXCIgeTI9XFxcIjFcXFwiIHgxPVxcXCIwXFxcIiB4Mj1cXFwiMFxcXCI+XFxuICAgIDxzdG9wIHN0b3AtY29sb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuYmdjb2xvcjEgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmJnY29sb3IxIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImJnY29sb3IxXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgb2Zmc2V0PVxcXCI1JVxcXCIgLz5cXG4gICAgPHN0b3Agc3RvcC1jb2xvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5iZ2NvbG9yMiB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuYmdjb2xvcjIgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiYmdjb2xvcjJcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBvZmZzZXQ9XFxcIjk1JVxcXCIgLz5cXG5cdDwvbGluZWFyR3JhZGllbnQ+XFxuPC9kZWZzPlxcbjxzdHlsZSB0eXBlPVxcXCJ0ZXh0L2Nzc1xcXCI+XFxuXHQuZnVuY19nOmhvdmVyIHsgc3Ryb2tlOmJsYWNrOyBzdHJva2Utd2lkdGg6MC41OyB9XFxuPC9zdHlsZT5cXG48c2NyaXB0IHR5cGU9XFxcInRleHQvamF2YXNjcmlwdFxcXCI+XFxuXHR2YXIgZGV0YWlscztcXG5cdGZ1bmN0aW9uIGluaXQoZXZ0KSB7IGRldGFpbHMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcXFwiZGV0YWlsc1xcXCIpLmZpcnN0Q2hpbGQ7IH1cXG4gIGZ1bmN0aW9uIHMoaW5mbykgeyBkZXRhaWxzLm5vZGVWYWx1ZSA9IFxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWV0eXBlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1ldHlwZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1ldHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI6IFxcXCIgKyBpbmZvOyB9XFxuXHRmdW5jdGlvbiBjKCkgeyBkZXRhaWxzLm5vZGVWYWx1ZSA9ICcgJzsgfVxcbjwvc2NyaXB0PlxcblxcbjxyZWN0IHg9XFxcIjAuMFxcXCIgeT1cXFwiMFxcXCIgaWQ9XFxcInN2Zy1iYWNrZ3JvdW5kXFxcIiB3aWR0aD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pbWFnZXdpZHRoIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pbWFnZXdpZHRoIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImltYWdld2lkdGhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBoZWlnaHQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW1hZ2VoZWlnaHQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmltYWdlaGVpZ2h0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImltYWdlaGVpZ2h0XCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwidXJsKCNiYWNrZ3JvdW5kKVxcXCIgIC8+XFxuPCEtLTx0ZXh0IHRleHQtYW5jaG9yPVxcXCJtaWRkbGVcXFwiIHg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGl0bGVYIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC50aXRsZVggOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidGl0bGVYXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgeT1cXFwiMjRcXFwiIGZvbnQtc2l6ZT1cXFwiMTdcXFwiIGZvbnQtZmFtaWx5PVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmZvbnR0eXBlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5mb250dHlwZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJmb250dHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGZpbGw9XFxcInJnYigwLDAsMClcXFwiPlwiO1xuICBzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnRpdGxldGV4dCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudGl0bGV0ZXh0IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRpdGxldGV4dFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3RleHQ+LS0+XFxuPHRleHQgdGV4dC1hbmNob3I9XFxcImxlZnRcXFwiIHg9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMueHBhZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAueHBhZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJ4cGFkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgeT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5kZXRhaWxzWSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZGV0YWlsc1kgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiZGV0YWlsc1lcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBmb250LXNpemU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZm9udHNpemUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZvbnRzaXplIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImZvbnRzaXplXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZm9udC1mYW1pbHk9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZm9udHR5cGUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmZvbnR0eXBlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImZvbnR0eXBlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgZmlsbD1cXFwicmdiKDAsMCwwKVxcXCIgaWQ9XFxcImRldGFpbHNcXFwiPiA8L3RleHQ+XFxuXFxuXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5vZGVzIDogZGVwdGgwKSwge1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgZGVwdGhzKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pO1xuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICByZXR1cm4gYnVmZmVyICsgXCJcXG48L3N2Zz5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZSxcInVzZURlcHRoc1wiOnRydWV9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHh0ZW5kICAgICAgICAgICA9IHJlcXVpcmUoJ3h0ZW5kJylcbiAgLCBwYXJzZUlucHV0ICAgICAgPSByZXF1aXJlKCcuL3N0YWNrcGFyc2UnKVxuICAsIGNvbnRleHRpZnkgICAgICA9IHJlcXVpcmUoJy4vY29udGV4dGlmeScpXG4gICwgc3ZnVGVtcGxhdGUgICAgID0gcmVxdWlyZSgnLi9zdmctdGVtcGxhdGUnKVxuICAsIGRlZmF1bHRPcHRzICAgICA9IHJlcXVpcmUoJy4vZGVmYXVsdC1vcHRzJylcblxuZnVuY3Rpb24gbmFycm93aWZ5KGNvbnRleHQsIG9wdHMpIHtcbiAgZnVuY3Rpb24gcHJvY2Vzc05vZGUobikge1xuICAgIG4uY2xhc3MgPSBuLm5hcnJvdyA/ICdoaWRkZW4nIDogJyc7XG4gIH1cblxuICBmdW5jdGlvbiBmaWx0ZXJOb2RlKG4pIHtcbiAgICByZXR1cm4gIW4ubmFycm93O1xuICB9XG5cbiAgaWYgKG9wdHMucmVtb3ZlbmFycm93cykgY29udGV4dC5ub2RlcyA9IGNvbnRleHQubm9kZXMuZmlsdGVyKGZpbHRlck5vZGUpO1xuICBlbHNlIGNvbnRleHQubm9kZXMuZm9yRWFjaChwcm9jZXNzTm9kZSk7XG59XG5cbnZhciBnbyA9IG1vZHVsZS5leHBvcnRzID0gXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbnRleHQgZnJvbSBhIGNhbGwgZ3JhcGggdGhhdCBoYXMgYmVlbiBjb2xsYXBzZWQgKGBzdGFja2NvbGxhcHNlLSpgKSBhbmQgcmVuZGVycyBzdmcgZnJvbSBpdC5cbiAqIFxuICogQG5hbWUgZmxhbWVncmFwaDo6c3ZnIFxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0FycmF5LjxzdHJpbmc+fSBjb2xsYXBzZWRMaW5lcyBjYWxsZ3JhcGggdGhhdCBoYXMgYmVlbiBjb2xsYXBzZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIG9wdGlvbnNcbiAqIEByZXR1cm4ge3N0cmluZ30gc3ZnIFxuICovXG5mdW5jdGlvbiBzdmcoY29sbGFwc2VkTGluZXMsIG9wdHMpIHtcbiAgb3B0cyA9IHh0ZW5kKGRlZmF1bHRPcHRzLCBvcHRzKTtcblxuICB2YXIgcGFyc2VkID0gcGFyc2VJbnB1dChjb2xsYXBzZWRMaW5lcylcbiAgdmFyIGNvbnRleHQgPSBjb250ZXh0aWZ5KHBhcnNlZCwgb3B0cylcblxuICBuYXJyb3dpZnkoY29udGV4dCwgb3B0cyk7XG5cbiAgcmV0dXJuIHN2Z1RlbXBsYXRlKGNvbnRleHQpO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIlxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBub3cgPSByZXF1aXJlKCdkYXRlLW5vdycpO1xuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAqIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAqIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICogbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAqXG4gKiBAc291cmNlIHVuZGVyc2NvcmUuanNcbiAqIEBzZWUgaHR0cDovL3Vuc2NyaXB0YWJsZS5jb20vMjAwOS8wMy8yMC9kZWJvdW5jaW5nLWphdmFzY3JpcHQtbWV0aG9kcy9cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uIHRvIHdyYXBcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lb3V0IGluIG1zIChgMTAwYClcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gd2hldGhlciB0byBleGVjdXRlIGF0IHRoZSBiZWdpbm5pbmcgKGBmYWxzZWApXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgaW1tZWRpYXRlKXtcbiAgdmFyIHRpbWVvdXQsIGFyZ3MsIGNvbnRleHQsIHRpbWVzdGFtcCwgcmVzdWx0O1xuICBpZiAobnVsbCA9PSB3YWl0KSB3YWl0ID0gMTAwO1xuXG4gIGZ1bmN0aW9uIGxhdGVyKCkge1xuICAgIHZhciBsYXN0ID0gbm93KCkgLSB0aW1lc3RhbXA7XG5cbiAgICBpZiAobGFzdCA8IHdhaXQgJiYgbGFzdCA+IDApIHtcbiAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgY29udGV4dCA9IHRoaXM7XG4gICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICB0aW1lc3RhbXAgPSBub3coKTtcbiAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICBpZiAoIXRpbWVvdXQpIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICBpZiAoY2FsbE5vdykge1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gRGF0ZS5ub3cgfHwgbm93XG5cbmZ1bmN0aW9uIG5vdygpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKClcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuLypnbG9iYWxzIEhhbmRsZWJhcnM6IHRydWUgKi9cbnZhciBiYXNlID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9iYXNlXCIpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3V0aWxzXCIpO1xudmFyIHJ1bnRpbWUgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3J1bnRpbWVcIik7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxudmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcbiAgaGIuRXhjZXB0aW9uID0gRXhjZXB0aW9uO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59O1xuXG52YXIgSGFuZGxlYmFycyA9IGNyZWF0ZSgpO1xuSGFuZGxlYmFycy5jcmVhdGUgPSBjcmVhdGU7XG5cbkhhbmRsZWJhcnNbJ2RlZmF1bHQnXSA9IEhhbmRsZWJhcnM7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gSGFuZGxlYmFyczsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBWRVJTSU9OID0gXCIyLjAuMFwiO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjt2YXIgQ09NUElMRVJfUkVWSVNJT04gPSA2O1xuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPT0gMS54LngnLFxuICA1OiAnPT0gMi4wLjAtYWxwaGEueCcsXG4gIDY6ICc+PSAyLjAuMC1iZXRhLjEnXG59O1xuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oLyogW2FyZ3MsIF1vcHRpb25zICovKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aC0xXS5uYW1lICsgXCInXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgICAgICBvcHRpb25zID0ge2RhdGE6IGRhdGF9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgdmFyIGNvbnRleHRQYXRoO1xuICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgIGNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG5cbiAgICAgICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7XG4gICAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuXG4gICAgICAgICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGtleTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGkgPT09IDApe1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCkgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pO1xuICAgICAgICBvcHRpb25zID0ge2RhdGE6ZGF0YX07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgbWVzc2FnZSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb29rdXAnLCBmdW5jdGlvbihvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAzLFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG1lc3NhZ2UpIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbnZhciBsb2cgPSBsb2dnZXIubG9nO1xuZXhwb3J0cy5sb2cgPSBsb2c7XG52YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIGZyYW1lID0gVXRpbHMuZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIHZhciBsaW5lO1xuICBpZiAobm9kZSAmJiBub2RlLmZpcnN0TGluZSkge1xuICAgIGxpbmUgPSBub2RlLmZpcnN0TGluZTtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgbm9kZS5maXJzdENvbHVtbjtcbiAgfVxuXG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICBpZiAobGluZSkge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBFeGNlcHRpb247IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gcmVxdWlyZShcIi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4vYmFzZVwiKS5SRVZJU0lPTl9DSEFOR0VTO1xudmFyIGNyZWF0ZUZyYW1lID0gcmVxdWlyZShcIi4vYmFzZVwiKS5jcmVhdGVGcmFtZTtcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICBlbnYuVk0uY2hlY2tSZXZpc2lvbih0ZW1wbGF0ZVNwZWMuY29tcGlsZXIpO1xuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIGluZGVudCwgbmFtZSwgY29udGV4dCwgaGFzaCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEsIGRlcHRocykge1xuICAgIGlmIChoYXNoKSB7XG4gICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBoYXNoKTtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSwgZGVwdGhzKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSwgZGVwdGhzOiBkZXB0aHMgfTtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgeyBkYXRhOiBkYXRhICE9PSB1bmRlZmluZWQsIGNvbXBhdDogdGVtcGxhdGVTcGVjLmNvbXBhdCB9LCBlbnYpO1xuICAgICAgcmVzdWx0ID0gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkge1xuICAgICAgaWYgKGluZGVudCkge1xuICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpbmVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmICghbGluZXNbaV0gJiYgaSArIDEgPT09IGwpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpbmVzW2ldID0gaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBsb29rdXA6IGZ1bmN0aW9uKGRlcHRocywgbmFtZSkge1xuICAgICAgdmFyIGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHRlbXBsYXRlU3BlY1tpXTtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGRhdGEsIGRlcHRocykge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZiAoZGF0YSB8fCBkZXB0aHMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBwcm9ncmFtKHRoaXMsIGksIGZuLCBkYXRhLCBkZXB0aHMpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uKGRhdGEsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAoZGF0YSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICByZXQgPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIHZhciByZXQgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XG5cbiAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICBkYXRhID0gaW5pdERhdGEoY29udGV4dCwgZGF0YSk7XG4gICAgfVxuICAgIHZhciBkZXB0aHM7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcbiAgICAgIGRlcHRocyA9IG9wdGlvbnMuZGVwdGhzID8gW2NvbnRleHRdLmNvbmNhdChvcHRpb25zLmRlcHRocykgOiBbY29udGV4dF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRlbXBsYXRlU3BlYy5tYWluLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBkYXRhLCBkZXB0aHMpO1xuICB9O1xuICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gIHJldC5fc2V0dXAgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwpIHtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIGVudi5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gIH07XG5cbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uKGksIGRhdGEsIGRlcHRocykge1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzICYmICFkZXB0aHMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ211c3QgcGFzcyBwYXJlbnQgZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtmdW5jdGlvbiBwcm9ncmFtKGNvbnRhaW5lciwgaSwgZm4sIGRhdGEsIGRlcHRocykge1xuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgb3B0aW9ucy5kYXRhIHx8IGRhdGEsIGRlcHRocyAmJiBbY29udGV4dF0uY29uY2F0KGRlcHRocykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gZGVwdGhzID8gZGVwdGhzLmxlbmd0aCA6IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEsIGRlcHRocykge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhLCBkZXB0aHM6IGRlcHRocyB9O1xuXG4gIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XG5cbmV4cG9ydHMubm9vcCA9IG5vb3A7ZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiAvKiAsIC4uLnNvdXJjZSAqLykge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7dmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZyArICcnO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtmdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59XG5cbmV4cG9ydHMuYXBwZW5kQ29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aDsiLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGhleEFkZHJlc3NSZWdleCA9IC8weCgoXFxkfFthYmNkZWZBQkNERUZdKXswLDJ9KSsvO1xuXG5mdW5jdGlvbiBieURlY2ltYWxBZGRyZXNzKGEsIGIpIHtcbiAgcmV0dXJuIGEuZGVjaW1hbEFkZHJlc3MgPCBiLmRlY2ltYWxBZGRyZXNzID8gLTEgOiAxO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzTGluZShhY2MsIHgpIHtcbiAgaWYgKCF4LnRyaW0oKS5sZW5ndGgpIHJldHVybiBhY2M7XG5cbiAgdmFyIHBhcnRzID0geC5zcGxpdCgvICsvKTtcbiAgaWYgKHBhcnRzLmxlbmd0aCA8IDMpIHJldHVybiBhY2M7XG5cbiAgdmFyIGRlY2ltYWwgPSBwYXJzZUludChwYXJ0c1swXSwgMTYpXG5cbiAgdmFyIGl0ZW0gPSB7IFxuICAgICAgYWRkcmVzcyAgICAgICAgOiBwYXJ0c1swXVxuICAgICwgc2l6ZSAgICAgICAgICAgOiBwYXJ0c1sxXVxuICAgICwgZGVjaW1hbEFkZHJlc3MgOiBkZWNpbWFsXG4gICAgLCBzeW1ib2wgICAgICAgICA6IHBhcnRzLnNsaWNlKDIpLmpvaW4oJyAnKSB9XG5cbiAgYWNjLnB1c2goaXRlbSk7XG4gIHJldHVybiBhY2M7XG59XG5cbi8qKlxuICogSW5zdGFudGlhdGVzIGEgSklUIHJlc29sdmVyIGZvciB0aGUgZ2l2ZW4gbWFwLlxuICogXG4gKiBAbmFtZSBKSVRSZXNvbHZlclxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheS48U3RyaW5nPn0gbWFwIGVpdGhlciBhIHN0cmluZyBvciBsaW5lcyB3aXRoIHNwYWNlIHNlcGFyYXRlZCBIZXhBZGRyZXNzLCBTaXplLCBTeW1ib2wgb24gZWFjaCBsaW5lXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBpbml0aWFsaXplZCBKSVQgcmVzb2x2ZXJcbiAqL1xuZnVuY3Rpb24gSklUUmVzb2x2ZXIobWFwKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBKSVRSZXNvbHZlcikpIHJldHVybiBuZXcgSklUUmVzb2x2ZXIobWFwKTtcbiAgXG4gIHZhciBsaW5lcyA9IEFycmF5LmlzQXJyYXkobWFwKSA/IG1hcCA6IG1hcC5zcGxpdCgnXFxuJylcbiAgdGhpcy5fYWRkcmVzc2VzID0gbGluZXNcbiAgICAucmVkdWNlKHByb2Nlc3NMaW5lLCBbXSlcbiAgICAuc29ydChieURlY2ltYWxBZGRyZXNzKVxuXG4gIHRoaXMuX2xlbiA9IHRoaXMuX2FkZHJlc3Nlcy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSklUUmVzb2x2ZXI7XG5cbnZhciBwcm90byA9IEpJVFJlc29sdmVyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBNYXRjaGVzIHRoZSBhZGRyZXNzIG9mIHRoZSBzeW1ib2wgb2Ygd2hpY2ggdGhlIGdpdmVuIGFkZHJlc3MgaXMgcGFydCBvZi5cbiAqIFxuICpcbiAqIEBuYW1lIEpJVFJlc29sdmVyOjpyZXNvbHZlXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gaGV4QWRkcmVzcyB0aGUgaGV4YWRlY2ltYWwgYWRkcmVzcyBvZiB0aGUgYWRkcmVzcyB0byBjaGVja1xuICogQHJldHVybiB7T2JqZWN0fSBpbmZvIG9mIHRoZSBtYXRjaGluZyBzeW1ib2wgd2hpY2ggaW5jbHVkZXMgYWRkcmVzcywgc2l6ZSwgc3ltYm9sXG4gKi9cbnByb3RvLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlKGhleEFkZHJlc3MpIHtcbiAgdmFyIG1hdGNoID0gbnVsbDtcbiAgdmFyIGEgPSB0eXBlb2YgaGV4QWRkcmVzcyA9PT0gJ251bWJlcicgPyBoZXhBZGRyZXNzIDogcGFyc2VJbnQoaGV4QWRkcmVzcywgMTYpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbGVuOyBpKyspIHtcbiAgICAvLyBvbmNlIHdlIGhpdCBhIGxhcmdlciBhZGRyZXNzIHRoYXQgbWVhbnMgb3VyIHN5bWJvbC9mdW5jdGlvbiB0aGF0IHRoaXNcbiAgICAvLyBhZGRyZXNzIGlzIHBhcnQgb2Ygc3RhcnRzIGF0IHRoZSBwcmV2aW91cyBhZGRyZXNzXG4gICAgaWYoYSA8IHRoaXMuX2FkZHJlc3Nlc1tpXS5kZWNpbWFsQWRkcmVzcykgeyBcbiAgICAgIG1hdGNoID0gdGhpcy5fYWRkcmVzc2VzW2kgLSAxXTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWF0Y2g7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXRIZXhBZGRyZXNzKGxpbmUpIHtcbiAgdmFyIG0gPSBsaW5lLm1hdGNoKGhleEFkZHJlc3NSZWdleCk7XG4gIHJldHVybiBtICYmIG1bMF07XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgYWxsIHN5bWJvbHMgaW4gYSBnaXZlbiBzdGFjayBhbmQgcmVwbGFjZXMgdGhlbSBhY2NvcmRpbmdseVxuICogXG4gKiBAbmFtZSBKSVRSZXNvbHZlcjo6cmVzb2x2ZU11bHRpXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz58U3RyaW5nfSBzdGFjayBzdHJpbmcgb2Ygc3RhY2sgb3IgbGluZXMgb2Ygc3RhY2tcbiAqIEBwYXJhbSB7ZnVuY3Rpb249fSBnZXRIZXhBZGRyZXNzIGFsbG93cyBvdmVycmlkaW5nIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGZpbmQgYSBoZXggYWRkcmVzcyBvbiBlYWNoIGxpbmVcbiAqIEByZXR1cm4ge0FycmF5LjxTdHJpbmc+fFN0cmluZ30gdGhlIHN0YWNrIHdpdGggc3ltYm9scyByZXNvbHZlZCBpbiB0aGUgc2FtZSBmb3JtYXQgdGhhdCB0aGUgc3RhY2sgd2FzIGdpdmVuLCBlaXRoZXIgYXMgbGluZXMgb3Igb25lIHN0cmluZ1xuICovXG5wcm90by5yZXNvbHZlTXVsdGkgPSBmdW5jdGlvbiByZXNvbHZlTXVsdGkoc3RhY2ssIGdldEhleEFkZHJlc3MpIHtcbiAgZ2V0SGV4QWRkcmVzcyA9IGdldEhleEFkZHJlc3MgfHwgZGVmYXVsdEdldEhleEFkZHJlc3M7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgaXNMaW5lcyA9IEFycmF5LmlzQXJyYXkoc3RhY2spXG4gIHZhciBsaW5lcyA9IGlzTGluZXMgPyBzdGFjayA6IHN0YWNrLnNwbGl0KCdcXG4nKVxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NMaW5lKGxpbmUpIHtcbiAgICB2YXIgYWRkcmVzcyA9IGdldEhleEFkZHJlc3MobGluZSk7XG4gICAgaWYgKCFhZGRyZXNzKSByZXR1cm4gbGluZTtcblxuICAgIHZhciByZXNvbHZlZCA9IHNlbGYucmVzb2x2ZShhZGRyZXNzKTtcbiAgICBpZiAoIXJlc29sdmVkKSByZXR1cm4gbGluZTtcblxuICAgIHJldHVybiBsaW5lLnJlcGxhY2UoYWRkcmVzcywgcmVzb2x2ZWQuc3ltYm9sKTtcbiAgfVxuICBcbiAgdmFyIHByb2Nlc3NlZExpbmVzID0gbGluZXMubWFwKHByb2Nlc3NMaW5lKTtcblxuICByZXR1cm4gaXNMaW5lcyA/IHByb2Nlc3NlZExpbmVzIDogcHJvY2Vzc2VkTGluZXMuam9pbignXFxuJyk7XG59XG4iLCIoZnVuY3Rpb24oZmFjdG9yeSl7XG4gIGlmICggdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kICkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoW10sIGZhY3RvcnkoKSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gTm9kZS9Db21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsc1xuICAgIHdpbmRvdy53aGVlbCA9IGZhY3RvcnkoKTtcbiAgfVxufVxuKGZ1bmN0aW9uKCl7XG5cbiAgLy9GdWxsIGRldGFpbHM6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL1JlZmVyZW5jZS9FdmVudHMvd2hlZWxcblxuICB2YXIgcHJlZml4ID0gXCJcIiwgX2FkZEV2ZW50TGlzdGVuZXIsIF9yZW1vdmVFdmVudExpc3RlbmVyLCBvbndoZWVsLCBzdXBwb3J0LCBmbnMgPSBbXTtcblxuICAvLyBkZXRlY3QgZXZlbnQgbW9kZWxcbiAgaWYgKCB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciApIHtcbiAgICBfYWRkRXZlbnRMaXN0ZW5lciA9IFwiYWRkRXZlbnRMaXN0ZW5lclwiO1xuICAgIF9yZW1vdmVFdmVudExpc3RlbmVyID0gXCJyZW1vdmVFdmVudExpc3RlbmVyXCI7XG4gIH0gZWxzZSB7XG4gICAgX2FkZEV2ZW50TGlzdGVuZXIgPSBcImF0dGFjaEV2ZW50XCI7XG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXIgPSBcImRldGFjaEV2ZW50XCI7XG4gICAgcHJlZml4ID0gXCJvblwiO1xuICB9XG5cbiAgLy8gZGV0ZWN0IGF2YWlsYWJsZSB3aGVlbCBldmVudFxuICBzdXBwb3J0ID0gXCJvbndoZWVsXCIgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSA/IFwid2hlZWxcIiA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuICAgICAgICAgICAgZG9jdW1lbnQub25tb3VzZXdoZWVsICE9PSB1bmRlZmluZWQgPyBcIm1vdXNld2hlZWxcIiA6IC8vIFdlYmtpdCBhbmQgSUUgc3VwcG9ydCBhdCBsZWFzdCBcIm1vdXNld2hlZWxcIlxuICAgICAgICAgICAgXCJET01Nb3VzZVNjcm9sbFwiOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcblxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNhbGxiYWNrKGVsZW1lbnQsY2FsbGJhY2ssY2FwdHVyZSkge1xuXG4gICAgdmFyIGZuID0gZnVuY3Rpb24ob3JpZ2luYWxFdmVudCkge1xuXG4gICAgICAhb3JpZ2luYWxFdmVudCAmJiAoIG9yaWdpbmFsRXZlbnQgPSB3aW5kb3cuZXZlbnQgKTtcblxuICAgICAgLy8gY3JlYXRlIGEgbm9ybWFsaXplZCBldmVudCBvYmplY3RcbiAgICAgIHZhciBldmVudCA9IHtcbiAgICAgICAgLy8ga2VlcCBhIHJlZiB0byB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0XG4gICAgICAgIG9yaWdpbmFsRXZlbnQ6IG9yaWdpbmFsRXZlbnQsXG4gICAgICAgIHRhcmdldDogb3JpZ2luYWxFdmVudC50YXJnZXQgfHwgb3JpZ2luYWxFdmVudC5zcmNFbGVtZW50LFxuICAgICAgICB0eXBlOiBcIndoZWVsXCIsXG4gICAgICAgIGRlbHRhTW9kZTogb3JpZ2luYWxFdmVudC50eXBlID09IFwiTW96TW91c2VQaXhlbFNjcm9sbFwiID8gMCA6IDEsXG4gICAgICAgIGRlbHRhWDogMCxcbiAgICAgICAgZGVsYXRaOiAwLFxuICAgICAgICBwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgb3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCA/XG4gICAgICAgICAgICBvcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCkgOlxuICAgICAgICAgICAgb3JpZ2luYWxFdmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBjYWxjdWxhdGUgZGVsdGFZIChhbmQgZGVsdGFYKSBhY2NvcmRpbmcgdG8gdGhlIGV2ZW50XG4gICAgICBpZiAoIHN1cHBvcnQgPT0gXCJtb3VzZXdoZWVsXCIgKSB7XG4gICAgICAgIGV2ZW50LmRlbHRhWSA9IC0gMS80MCAqIG9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YTtcbiAgICAgICAgLy8gV2Via2l0IGFsc28gc3VwcG9ydCB3aGVlbERlbHRhWFxuICAgICAgICBvcmlnaW5hbEV2ZW50LndoZWVsRGVsdGFYICYmICggZXZlbnQuZGVsdGFYID0gLSAxLzQwICogb3JpZ2luYWxFdmVudC53aGVlbERlbHRhWCApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXZlbnQuZGVsdGFZID0gb3JpZ2luYWxFdmVudC5kZXRhaWw7XG4gICAgICB9XG5cbiAgICAgIC8vIGl0J3MgdGltZSB0byBmaXJlIHRoZSBjYWxsYmFja1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKCBldmVudCApO1xuXG4gICAgfTtcblxuICAgIGZucy5wdXNoKHtcbiAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXG4gICAgICBmbjogZm4sXG4gICAgICBjYXB0dXJlOiBjYXB0dXJlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZm47XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDYWxsYmFjayhlbGVtZW50LGNhcHR1cmUpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZucy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGZuc1tpXS5lbGVtZW50ID09PSBlbGVtZW50ICYmIGZuc1tpXS5jYXB0dXJlID09PSBjYXB0dXJlKSB7XG4gICAgICAgIHJldHVybiBmbnNbaV0uZm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpe307XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVDYWxsYmFjayhlbGVtZW50LGNhcHR1cmUpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZucy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGZuc1tpXS5lbGVtZW50ID09PSBlbGVtZW50ICYmIGZuc1tpXS5jYXB0dXJlID09PSBjYXB0dXJlKSB7XG4gICAgICAgIHJldHVybiBmbnMuc3BsaWNlKGksMSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gX2FkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKSB7XG4gICAgXG4gICAgdmFyIGNiO1xuXG4gICAgaWYgKHN1cHBvcnQgPT09IFwid2hlZWxcIikge1xuICAgICAgY2IgPSBjYWxsYmFjaztcbiAgICB9IGVsc2Uge1xuICAgICAgY2IgPSBjcmVhdGVDYWxsYmFjayhlbGVtLGNhbGxiYWNrLHVzZUNhcHR1cmUpO1xuICAgIH1cblxuICAgIGVsZW1bIF9hZGRFdmVudExpc3RlbmVyIF0oIHByZWZpeCArIGV2ZW50TmFtZSwgY2IsIHVzZUNhcHR1cmUgfHwgZmFsc2UgKTtcblxuICB9XG5cbiAgZnVuY3Rpb24gX3JlbW92ZVdoZWVsTGlzdGVuZXIoIGVsZW0sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKSB7XG5cbiAgICBpZiAoc3VwcG9ydCA9PT0gXCJ3aGVlbFwiKSB7XG4gICAgICBjYiA9IGNhbGxiYWNrO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYiA9IGdldENhbGxiYWNrKGVsZW0sdXNlQ2FwdHVyZSk7XG4gICAgfVxuXG4gICAgZWxlbVsgX3JlbW92ZUV2ZW50TGlzdGVuZXIgXSggcHJlZml4ICsgZXZlbnROYW1lLCBjYiwgdXNlQ2FwdHVyZSB8fCBmYWxzZSApO1xuXG4gICAgcmVtb3ZlQ2FsbGJhY2soZWxlbSx1c2VDYXB0dXJlKTtcblxuICB9XG5cbiAgZnVuY3Rpb24gYWRkV2hlZWxMaXN0ZW5lciggZWxlbSwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKSB7XG4gICAgX2FkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIHN1cHBvcnQsIGNhbGxiYWNrLCB1c2VDYXB0dXJlICk7XG5cbiAgICAvLyBoYW5kbGUgTW96TW91c2VQaXhlbFNjcm9sbCBpbiBvbGRlciBGaXJlZm94XG4gICAgaWYoIHN1cHBvcnQgPT0gXCJET01Nb3VzZVNjcm9sbFwiICkge1xuICAgICAgICBfYWRkV2hlZWxMaXN0ZW5lciggZWxlbSwgXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsIGNhbGxiYWNrLCB1c2VDYXB0dXJlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVXaGVlbExpc3RlbmVyKGVsZW0sY2FsbGJhY2ssdXNlQ2FwdHVyZSl7XG4gICAgX3JlbW92ZVdoZWVsTGlzdGVuZXIoZWxlbSxzdXBwb3J0LGNhbGxiYWNrLHVzZUNhcHR1cmUpO1xuXG4gICAgLy8gaGFuZGxlIE1vek1vdXNlUGl4ZWxTY3JvbGwgaW4gb2xkZXIgRmlyZWZveFxuICAgIGlmKCBzdXBwb3J0ID09IFwiRE9NTW91c2VTY3JvbGxcIiApIHtcbiAgICAgICAgX3JlbW92ZVdoZWVsTGlzdGVuZXIoZWxlbSwgXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsIGNhbGxiYWNrLCB1c2VDYXB0dXJlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG9uOiBhZGRXaGVlbExpc3RlbmVyLFxuICAgIG9mZjogcmVtb3ZlV2hlZWxMaXN0ZW5lclxuICB9O1xuXG59KSk7IiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnZGVib3VuY2UnKVxuXG52YXIgc2VhcmNoRmllbGRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWFyY2gudWktcGFydCBpbnB1dFt0eXBlPXNlYXJjaF0nKVxuICAsIHJlZ2V4Q2hlY2tFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWFyY2gtcmVnZXgnKVxuICAsIGJsaW5rQ2hlY2tFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWFyY2gtYmxpbmsnKVxuICAsIHNlYXJjaEVycm9yRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoLWVycm9yJylcblxuZnVuY3Rpb24gdHJ5TWFrZVJlZ2V4KHF1ZXJ5KSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAocXVlcnksICdpJyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIHNlYXJjaEVycm9yRWwudmFsdWUgPSBlLm1lc3NhZ2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkTWF0Y2hJbmRpY2F0b3IoZWwpIHtcbiAgZWwuY2xhc3NMaXN0LmFkZCgnbWF0Y2gnKTsgIFxuICB2YXIgcmVjdCA9IGVsLmNoaWxkcmVuWzFdXG4gIHZhciB3ID0gcmVjdC5nZXRBdHRyaWJ1dGUoJ3dpZHRoJyk7XG4gIHZhciBoID0gcmVjdC5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpO1xuIFxuICAvLyBtYWtlIGludmlzaWJsZSBvciB0b28gc21hbGwgbm9kZXMgdGhhdCBtYXRjaGVkIHRoZSBzZWFyY2ggdmlzaWJsZVxuICBpZiAodyA8IDEwKSB7XG4gICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgMTApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU1hdGNoSW5kaWNhdG9yKGVsKSB7XG4gIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ21hdGNoJyk7ICBcbiAgdmFyIHJlY3QgPSBlbC5jaGlsZHJlblsxXVxuICByZWN0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCBwYXJzZUludChyZWN0LmRhdGFzZXQud2lkdGgpKTtcbiAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHBhcnNlSW50KHJlY3QuZGF0YXNldC5oZWlnaHQpKTtcbn1cblxuZnVuY3Rpb24gYWRkQmxpbmsoZWwpIHtcbiAgZWwuY2xhc3NMaXN0LmFkZCgnYmxpbmsnKTsgIFxufVxuXG5mdW5jdGlvbiByZW1vdmVCbGluayhlbCkge1xuICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdibGluaycpOyAgXG59XG5cbmZ1bmN0aW9uIGNsZWFyTWF0Y2hlcygpIHtcbiAgdmFyIG1hdGNoZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdnLmZ1bmNfZy5tYXRjaCcpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICByZW1vdmVNYXRjaEluZGljYXRvcihtYXRjaGVzLml0ZW0oaSkpOyAgXG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYXJCbGlua3MoKSB7XG4gIHZhciBtYXRjaGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZy5mdW5jX2cuYmxpbmsnKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXRjaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVtb3ZlQmxpbmsobWF0Y2hlcy5pdGVtKGkpKTsgIFxuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFyRXJyb3IoKSB7XG4gIHNlYXJjaEVycm9yRWwudmFsdWUgPSAnJztcbn1cblxuZnVuY3Rpb24gaW5kaWNhdGVNYXRjaChlbCwgYmxpbmspIHtcbiAgYWRkTWF0Y2hJbmRpY2F0b3IoZWwpO1xuICBpZiAoYmxpbmspIGFkZEJsaW5rKGVsKTtcbn1cblxuZnVuY3Rpb24gb25RdWVyeUNoYW5nZSgpIHtcbiAgY2xlYXJNYXRjaGVzKCk7XG4gIGNsZWFyQmxpbmtzKCk7XG4gIGNsZWFyRXJyb3IoKTtcblxuICB2YXIgcXVlcnkgPSBzZWFyY2hGaWVsZEVsLnZhbHVlLnRyaW0oKTtcbiAgdmFyIGlzcmVnZXggPSByZWdleENoZWNrRWwuY2hlY2tlZDtcbiAgdmFyIGJsaW5rID0gYmxpbmtDaGVja0VsLmNoZWNrZWQ7XG4gIGlmICghcXVlcnkubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIHJlZ2V4O1xuICBpZiAoaXNyZWdleCkgeyBcbiAgICByZWdleCA9IHRyeU1ha2VSZWdleChxdWVyeSk7XG4gICAgaWYgKCFyZWdleCkgcmV0dXJuO1xuICB9IGVsc2Uge1xuICAgIHF1ZXJ5ID0gcXVlcnkudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHZhciBmdW5jX2dzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZy5mdW5jX2cnKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmdW5jX2dzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGZ1bmNfZyA9IGZ1bmNfZ3NbaV07XG5cbiAgICBpZiAoaXNyZWdleCkge1xuICAgICAgaWYgKHJlZ2V4LnRlc3QoZnVuY19nLmRhdGFzZXQuc2VhcmNoKSkgaW5kaWNhdGVNYXRjaChmdW5jX2csIGJsaW5rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKH5mdW5jX2cuZGF0YXNldC5zZWFyY2guaW5kZXhPZihxdWVyeSkpIGluZGljYXRlTWF0Y2goZnVuY19nLCBibGluayk7XG4gICAgfVxuICB9XG59XG5cblxudmFyIGdvID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbml0U2VhcmNoKCkge1xuICBzZWFyY2hGaWVsZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZGVib3VuY2Uob25RdWVyeUNoYW5nZSwgMjAwKSk7XG4gIHJlZ2V4Q2hlY2tFbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBvblF1ZXJ5Q2hhbmdlKTtcbiAgYmxpbmtDaGVja0VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIG9uUXVlcnlDaGFuZ2UpO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5yZWZyZXNoID0gb25RdWVyeUNoYW5nZTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuLypqc2hpbnQgYnJvd3NlcjogdHJ1ZSovXG5cbnZhciBmbGFtZWdyYXBoID0gcmVxdWlyZSgnLi4vJylcbiAgLCBqaXRSZXNvbHZlciA9IHJlcXVpcmUoJ3Jlc29sdmUtaml0LXN5bWJvbHMnKVxuICAsIGluaXRTZWFyY2ggPSByZXF1aXJlKCcuL2luaXQtc2VhcmNoJylcbiAgLCB6b29tID0gcmVxdWlyZSgnLi96b29tJykoKVxuICAsIHJlc29sdmVyO1xuXG52YXIgb3B0c1RlbXBsYXRlID0gcmVxdWlyZSgnLi9vcHRzLXRlbXBsYXRlLmhicycpO1xuXG52YXIgZmxhbWVncmFwaEVsICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZsYW1lZ3JhcGgnKTtcbnZhciBjYWxsZ3JhcGhGaWxlRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FsbGdyYXBoLWZpbGUnKVxudmFyIG1hcEZpbGVFbCAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtZmlsZScpXG52YXIgb3B0aW9uc0VsICAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29wdGlvbnMnKTtcbnZhciBpbnN0cnVjdGlvbnNFbCAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5zdHJ1Y3Rpb25zJyk7XG5cbnZhciBleGNsdWRlT3B0aW9ucyA9IFsgJ2ZvbnR0eXBlJywgJ2ZvbnR3aWR0aCcsICdmb250c2l6ZScsICdpbWFnZXdpZHRoJywgJ2NvdW50bmFtZScsICdjb2xvcnMnLCAndGltZW1heCcsICdmYWN0b3InLCAnaGFzaCcsICd0aXRsZScsICd0aXRsZXN0cmluZycsICduYW1ldHlwZScsICdiZ2NvbG9yMScsICdiZ2NvbG9yMicgXTtcbnZhciB1c2VkTWV0YUtleXMgPSBPYmplY3Qua2V5cyhmbGFtZWdyYXBoLmRlZmF1bHRPcHRzTWV0YSkuZmlsdGVyKGZ1bmN0aW9uIChrKSB7IHJldHVybiAhfmV4Y2x1ZGVPcHRpb25zLmluZGV4T2YoaykgfSk7XG5cbnZhciBjdXJyZW50Q2FsbGdyYXBoO1xuXG5mdW5jdGlvbiByZW5kZXJPcHRpb25zKCkge1xuICB2YXIgb3B0cyA9IGZsYW1lZ3JhcGguZGVmYXVsdE9wdHNcbiAgICAsIG1ldGEgPSBmbGFtZWdyYXBoLmRlZmF1bHRPcHRzTWV0YTtcblxuICB2YXIgY29udGV4dCA9IHVzZWRNZXRhS2V5c1xuICAgIC5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgaykge1xuICAgICAgdmFyIHR5cGUgPSBtZXRhW2tdLnR5cGU7XG4gICAgICByZXR1cm4gYWNjLmNvbmNhdCh7XG4gICAgICAgICAgbmFtZSAgICAgICAgOiBrXG4gICAgICAgICwgdmFsdWUgICAgICAgOiBvcHRzW2tdXG4gICAgICAgICwgdHlwZSAgICAgICAgOiB0eXBlXG4gICAgICAgICwgZGVzY3JpcHRpb24gOiBtZXRhW2tdLmRlc2NyaXB0aW9uXG4gICAgICAgICwgbWluICAgICAgICAgOiBtZXRhW2tdLm1pblxuICAgICAgICAsIG1heCAgICAgICAgIDogbWV0YVtrXS5tYXhcbiAgICAgICAgLCBzdGVwICAgICAgICA6IG1ldGFba10uc3RlcFxuICAgICAgfSk7XG4gICAgfSwgW10pO1xuICB2YXIgaHRtbCA9IG9wdHNUZW1wbGF0ZShjb250ZXh0KTtcbiAgb3B0aW9uc0VsLmlubmVySFRNTCA9IGh0bWw7XG5cbiAgLy8gTmVlZCB0byBzZXQgdmFsdWUgaW4gSlMgc2luY2UgaXQncyBub3QgcGlja2VkIHVwIHdoZW4gc2V0IGluIGh0bWwgdGhhdCBpcyBhZGRlZCB0byBET00gYWZ0ZXJ3YXJkc1xuICB1c2VkTWV0YUtleXMgXG4gICAgLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgIHZhciB2YWwgPSBvcHRzW2tdO1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoayk7XG4gICAgICBlbC52YWx1ZSA9IHZhbDtcbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiBnZXRPcHRpb25zKCkge1xuICB2YXIgbWV0YSA9IGZsYW1lZ3JhcGguZGVmYXVsdE9wdHNNZXRhO1xuXG4gIHJldHVybiB1c2VkTWV0YUtleXMgXG4gICAgLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrKSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChrKTtcbiAgICAgIHZhciB2YWwgPSBlbC52YWx1ZTtcbiAgICAgIGlmIChtZXRhW2tdLnR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHZhbCA9IHZhbC5sZW5ndGggPyBwYXJzZUZsb2F0KHZhbCkgOiBJbmZpbml0eTtcbiAgICAgIH0gZWxzZSBpZiAobWV0YVtrXS50eXBlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdmFsID0gdmFsLmxlbmd0aCA/IEJvb2xlYW4odmFsKSA6IGZhbHNlOyBcbiAgICAgIH0gZWxzZSBpZiAobWV0YVtrXS50eXBlID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgIHZhbCA9IGVsLmNoZWNrZWQgPyB0cnVlIDogZmFsc2VcbiAgICAgIH1cbiAgICAgIGFjY1trXSA9IHZhbDtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgZmxhbWVncmFwaC5kZWZhdWx0T3B0cyk7XG59XG5cbmZ1bmN0aW9uIG9uT3B0aW9uc0NoYW5nZShlKSB7XG4gIHJlZnJlc2goKTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDaGFuZ2UoKSB7XG4gIHZhciBpbnB1dHMgPSBvcHRpb25zRWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylcbiAgICAsIGksIGVsO1xuICBcbiAgZm9yIChpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgIGVsID0gaW5wdXRzW2ldO1xuICAgIGVsLm9uY2hhbmdlID0gb25PcHRpb25zQ2hhbmdlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhvb2tIb3Zlck1ldGhvZHMoKSB7XG4gIHZhciBkZXRhaWxzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZXRhaWxzXCIpLmZpcnN0Q2hpbGQ7XG4gIHdpbmRvdy5zID0gZnVuY3Rpb24gcyhpbmZvKSB7IFxuICAgIGRldGFpbHMubm9kZVZhbHVlID0gXCJGdW5jdGlvbjogXCIgKyBpbmZvOyBcbiAgfVxuICB3aW5kb3cuYyA9IGZ1bmN0aW9uIGMoKSB7IFxuICAgIGRldGFpbHMubm9kZVZhbHVlID0gJyAnOyBcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXIoYXJyKSB7XG4gIGlmIChpbnN0cnVjdGlvbnNFbC5wYXJlbnRFbGVtZW50KSBpbnN0cnVjdGlvbnNFbC5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGluc3RydWN0aW9uc0VsKTtcblxuICB2YXIgb3B0cyA9IGdldE9wdGlvbnMoKTtcblxuICB2YXIgc3ZnO1xuICB0cnkge1xuICAgIGN1cnJlbnRDYWxsZ3JhcGggPSBhcnI7XG4gICAgb3B0cy5yZW1vdmVuYXJyb3dzID0gZmFsc2U7XG4gICAgc3ZnID0gZmxhbWVncmFwaChhcnIsIG9wdHMpO1xuICAgIGZsYW1lZ3JhcGhFbC5pbm5lckhUTUw9IHN2ZztcbiAgICBob29rSG92ZXJNZXRob2RzKCk7XG4gICAgem9vbS5pbml0KG9wdHMpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBmbGFtZWdyYXBoRWwuaW5uZXJIVE1MID0gJzxicj48cCBjbGFzcz1cImVycm9yXCI+JyArIGVyci50b1N0cmluZygpICsgJzwvcD4nO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gIGlmICghY3VycmVudENhbGxncmFwaCkgcmV0dXJuO1xuICByZW5kZXIoY3VycmVudENhbGxncmFwaCk7XG4gIGluaXRTZWFyY2gucmVmcmVzaCgpO1xufVxuXG5mdW5jdGlvbiByZWFkRmlsZShmaWxlLCBjYikge1xuICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gIGZpbGVSZWFkZXIucmVhZEFzVGV4dChmaWxlLCAndXRmLTgnKTtcbiAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiBvbmxvYWQoZXJyKSB7XG4gICAgY2IoZXJyLCBmaWxlUmVhZGVyLnJlc3VsdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gb25GaWxlKGUsIHByb2Nlc3MpIHtcbiAgdmFyIGZpbGUgPSBlLnRhcmdldC5maWxlc1swXTtcbiAgaWYgKCFmaWxlKSByZXR1cm47XG4gIHJlYWRGaWxlKGZpbGUsIHByb2Nlc3MpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzQ2FsbGdyYXBoRmlsZShlKSB7XG4gIHZhciBhcnIgPSBlLnRhcmdldC5yZXN1bHQuc3BsaXQoJ1xcbicpO1xuICBpZiAocmVzb2x2ZXIpIGFyciA9IHJlc29sdmVyLnJlc29sdmVNdWx0aShhcnIpO1xuICByZW5kZXIoYXJyKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc01hcEZpbGUoZSkge1xuICB2YXIgbWFwID0gZS50YXJnZXQucmVzdWx0O1xuICByZXNvbHZlciA9IGppdFJlc29sdmVyKG1hcCk7XG4gIGlmIChjdXJyZW50Q2FsbGdyYXBoKSBjdXJyZW50Q2FsbGdyYXBoID0gcmVzb2x2ZXIucmVzb2x2ZU11bHRpKGN1cnJlbnRDYWxsZ3JhcGgpO1xuICByZWZyZXNoKCk7XG59XG5cbmZ1bmN0aW9uIG9uQ2FsbGdyYXBoRmlsZShlKSB7XG4gIG9uRmlsZShlLCBwcm9jZXNzQ2FsbGdyYXBoRmlsZSk7XG59XG5cbmZ1bmN0aW9uIG9uTWFwRmlsZShlKSB7XG4gIG9uRmlsZShlLCBwcm9jZXNzTWFwRmlsZSk7XG59XG5cbi8vIEV2ZW50IExpc3RlbmVyc1xuY2FsbGdyYXBoRmlsZUVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIG9uQ2FsbGdyYXBoRmlsZSk7XG5tYXBGaWxlRWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgb25NYXBGaWxlKTtcblxuLy8gU2V0dXAgXG5yZW5kZXJPcHRpb25zKCk7XG5yZWdpc3RlckNoYW5nZSgpO1xuaW5pdFNlYXJjaChmbGFtZWdyYXBoRWwpO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdmFyIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJvcHRpb25zLWlucHV0XFxcIj5cXG4gIDxwPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGVzY3JpcHRpb24gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRlc2NyaXB0aW9uIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImRlc2NyaXB0aW9uXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvcD5cXG4gIDxpbnB1dCB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnR5cGUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnR5cGUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidHlwZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgdmFsdWVcXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy52YWx1ZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudmFsdWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidmFsdWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmNoZWNrZWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNoZWNrZWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiY2hlY2tlZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCIgbWluPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm1pbiB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubWluIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcIm1pblwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIG1heD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5tYXggfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1heCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJtYXhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBzdGVwPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnN0ZXAgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnN0ZXAgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic3RlcFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcbjwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB2YXIgc3RhY2sxLCBidWZmZXIgPSBcIlwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMCwge1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgcmV0dXJuIGJ1ZmZlcjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgd2hlZWwgPSByZXF1aXJlKCd1bml3aGVlbCcpO1xudmFyIGZsYW1lZ3JhcGhFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmbGFtZWdyYXBoJyk7XG5cbi8vY29uc29sZS5sb2coeyBvZmZzZXRZOiBlLm9mZnNldFksIG1vdmVtZW50WTogZS5tb3ZlbWVudFksIHNjcmVlblk6IGUuc2NyZWVuWSB9KTtcblxuZnVuY3Rpb24gcGVyZm9ybVpvb20oem9vbSkge1xuICByZXR1cm4gZnVuY3Rpb24geihlKSB7XG4gICAgem9vbS5fem9vbShlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBab29tKCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgWm9vbSkpIHJldHVybiBuZXcgWm9vbSgpO1xuICB0aGlzLl9mbGFtZWdyYXBoU3ZnRWwgPSB1bmRlZmluZWQ7IFxuICB0aGlzLl96b29tTGV2ZWwgPSAxO1xufVxuXG52YXIgcHJvdG8gPSBab29tLnByb3RvdHlwZTtcbm1vZHVsZS5leHBvcnRzID0gWm9vbTtcblxucHJvdG8uaW5pdCA9IGZ1bmN0aW9uIGluaXQob3B0cykge1xuICBpZiAodGhpcy5fZmxhbWVncmFwaFN2Z0VsKSB3aGVlbC5vZmYodGhpcy5fZmxhbWVncmFwaFN2Z0VsLCB0aGlzLl9wZXJmb3JtWm9vbSk7XG5cbiAgdGhpcy5fem9vbUxldmVsID0gMTtcblxuICB0aGlzLl9mbGFtZWdyYXBoU3ZnRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmxhbWVncmFwaC1zdmcnKTtcbiAgdGhpcy5fc3ZnQmFja2dyb3VuZEVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N2Zy1iYWNrZ3JvdW5kJyk7XG4gIHRoaXMuX3ZpZXdCb3hXaWR0aCA9IHRoaXMuX2ZsYW1lZ3JhcGhTdmdFbC5kYXRhc2V0LndpZHRoO1xuICB0aGlzLl92aWV3Qm94SGVpZ2h0ID0gdGhpcy5fZmxhbWVncmFwaFN2Z0VsLmRhdGFzZXQuaGVpZ2h0O1xuICB0aGlzLl9wZXJmb3JtWm9vbSA9IHBlcmZvcm1ab29tKHRoaXMpO1xuXG4gIHRoaXMuX29wdHMgPSBvcHRzO1xuXG4gIGlmICh0aGlzLl9mbGFtZWdyYXBoU3ZnRWwpIHdoZWVsLm9uKHRoaXMuX2ZsYW1lZ3JhcGhTdmdFbCwgdGhpcy5fcGVyZm9ybVpvb20sIGZhbHNlKTtcbn1cblxucHJvdG8uX3JlZHJhd1RleHQgPSBmdW5jdGlvbiBfcmVkcmF3VGV4dChmdW5jTmFtZSwgdGV4dEVsLCB3aWR0aCkge1xuICB2YXIgY2hhcnMgPSB3aWR0aCAvIDggLy8gKG9wdHMuZm9udHNpemUgKiBvcHRzLmZvbnR3aWR0aClcbiAgdmFyIHRleHQ7XG4gIGlmIChjaGFycyA+PSAzKSB7IC8vIGVub3VnaCByb29tIHRvIGRpc3BsYXkgZnVuY3Rpb24gbmFtZT9cbiAgICB0ZXh0ID0gZnVuY05hbWUuc2xpY2UoMCwgY2hhcnMpO1xuICAgIGlmIChjaGFycyA8IGZ1bmNOYW1lLmxlbmd0aCkgdGV4dCA9IHRleHQuc2xpY2UoMCwgY2hhcnMgLSAyKSArICcuLic7XG4gICAgdGV4dEVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgfSBlbHNlIHtcbiAgICB0ZXh0RWwudGV4dENvbnRlbnQgPSAnJztcbiAgfVxufVxuXG5cbnByb3RvLl96b29tUmVjdHMgPSBmdW5jdGlvbiBfem9vbVJlY3RzKCkge1xuICB2YXIgZnVuYywgdGV4dCwgcmVjdCwgY2hpbGRyZW4sIHcsIHgsIGZ1bmNOYW1lO1xuICB2YXIgbmV3V2lkdGgsIG5ld1g7XG4gIFxuICAvLyB6b29tIHdpZHRoIG9mIGVhY2ggcmVjdCBcbiAgdmFyIGZ1bmNzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZy5mdW5jX2cnKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmdW5jcy5sZW5ndGg7IGkrKykge1xuICAgIGZ1bmMgPSBmdW5jc1tpXTtcbiAgICB0ZXh0ID0gZnVuYy5jaGlsZHJlblsyXTtcbiAgICByZWN0ID0gZnVuYy5jaGlsZHJlblsxXTtcbiAgXG4gICAgdyA9IHJlY3QuZGF0YXNldC53aWR0aDtcbiAgICBuZXdXaWR0aCA9IHcgKiB0aGlzLl96b29tTGV2ZWw7XG5cbiAgICAvLyBlbnN1cmUgdG8ga2VlcCBzZWFyY2ggbWF0Y2hlcyB2aXNpYmxlXG4gICAgaWYgKGZ1bmMuY2xhc3NMaXN0LmNvbnRhaW5zKCdtYXRjaCcpICYmIG5ld1dpZHRoIDwgMTApIG5ld1dpZHRoID0gMTA7XG5cbiAgICAvLyBoaWRlL3Nob3cgcmVjdHMgYWNjb3JkaW5nIHRvIGNoYW5nZSB3aWR0aFxuICAgIGlmIChuZXdXaWR0aCA8IHRoaXMuX29wdHMubWlud2lkdGgpIGZ1bmMuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgZWxzZSBmdW5jLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgeCA9IHJlY3QuZGF0YXNldC54O1xuICAgIG5ld1ggPSB4ICogdGhpcy5fem9vbUxldmVsO1xuICAgIFxuICAgIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIG5ld1dpZHRoKTtcbiAgICByZWN0LnNldEF0dHJpYnV0ZSgneCcsIG5ld1gpO1xuICAgIFxuICAgIGlmICghdGV4dCkgY29udGludWU7XG4gICAgeCA9IHRleHQuZGF0YXNldC54O1xuICAgIHRleHQuc2V0QXR0cmlidXRlKCd4JywgeCAqIHRoaXMuX3pvb21MZXZlbCk7XG5cbiAgICBmdW5jTmFtZSA9IGZ1bmMuZGF0YXNldC5mdW5jbmFtZTtcbiAgICB0aGlzLl9yZWRyYXdUZXh0KGZ1bmNOYW1lLCB0ZXh0LCB3ICogdGhpcy5fem9vbUxldmVsKTtcbiAgfVxufVxuXG5wcm90by5fem9vbSA9IGZ1bmN0aW9uIF96b29tKGUpIHtcbiAgaWYgKCFlLmN0cmxLZXkpIHJldHVybjtcblxuICB2YXIgYWRkID0gKC1lLndoZWVsRGVsdGFZIC8gNDAwICogdGhpcy5fem9vbUxldmVsICk7XG4gIGlmICghYWRkKSByZXR1cm47XG5cbiAgdGhpcy5fem9vbUxldmVsID0gYWRkICsgdGhpcy5fem9vbUxldmVsO1xuICB0aGlzLl96b29tTGV2ZWwgPSBNYXRoLm1heCgxLCB0aGlzLl96b29tTGV2ZWwpO1xuICB0aGlzLl96b29tTGV2ZWwgPSBNYXRoLm1pbig1MDAwLCB0aGlzLl96b29tTGV2ZWwpO1xuXG4gIHZhciB3LCB4LCBjdXJyZW50V2lkdGgsIG5ld1dpZHRoLCBuZXdWaWV3Qm94LCB2aWV3WDtcblxuICAvLyB6b29tIG92ZXJhbGwgaW1hZ2Ugd2lkdGhcbiAgY3VycmVudFdpZHRoID0gdGhpcy5fZmxhbWVncmFwaFN2Z0VsLmdldEF0dHJpYnV0ZSgnd2lkdGgnKVxuICB3ID0gdGhpcy5fZmxhbWVncmFwaFN2Z0VsLmRhdGFzZXQud2lkdGg7XG4gIHggPSB0aGlzLl9mbGFtZWdyYXBoU3ZnRWwuZGF0YXNldC54O1xuXG4gIG5ld1dpZHRoID0gdyAqIHRoaXMuX3pvb21MZXZlbDtcbiAgbmV3Vmlld0JveCA9ICcwIDAgJyArIG5ld1dpZHRoICsgJyAnICsgdGhpcy5fdmlld0JveEhlaWdodDtcblxuICB0aGlzLl9mbGFtZWdyYXBoU3ZnRWwuc2V0QXR0cmlidXRlKCd3aWR0aCcsIG5ld1dpZHRoKTtcbiAgdGhpcy5fc3ZnQmFja2dyb3VuZEVsLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCBuZXdXaWR0aCk7XG4gIHRoaXMuX2ZsYW1lZ3JhcGhTdmdFbC5zZXRBdHRyaWJ1dGUoJ3ZpZXdCb3gnLCBuZXdWaWV3Qm94KVxuXG4gIHRoaXMuX3pvb21SZWN0cygpO1xuXG4gIHZhciBzY3JvbGxSYXRpbyA9IGZsYW1lZ3JhcGhFbC5zY3JvbGxMZWZ0IC8gY3VycmVudFdpZHRoO1xuICBmbGFtZWdyYXBoRWwuc2Nyb2xsTGVmdCA9IG5ld1dpZHRoICogc2Nyb2xsUmF0aW87XG59XG4iXX0=
