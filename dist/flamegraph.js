(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.flamegraph = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var svg                 = require('./lib/svg')
var defaultOpts         = require('./lib/default-opts')
var defaultOptsMeta     = require('./lib/default-opts-meta')
var cpuprofilify        = require('cpuprofilify')
var cpuprofileProcessor = require('./lib/cpuprofile-processor')

function processCpuProfile(cpuprofile, opts) {
 return cpuprofileProcessor(cpuprofile, opts).process()
}

function fromCpuProfile(cpuprofile, opts) {
  var processed = processCpuProfile(cpuprofile, opts)
  return svg(processed, opts)
}

exports = module.exports =

/**
 * Converts an array of call graph lines into an svg document.
 *
 * @name flamegraph
 * @function
 * @param {Array.<string>} arr          input lines to render svg for
 * @param {Object} opts                 objects that affect the visualization
 * @param {Object} opts.profile         options passed to cpuprofilify @see [cpuprofilify.convert params](https://github.com/thlorenz/cpuprofilify#parameters)
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
 * @return {string} svg                 the rendered svg
 */
function flamegraph(arr, opts) {
  var profile
  if (!Array.isArray(arr)) throw new TypeError('First arg needs to be an array of lines.')

  opts = opts || {}
  try {
    profile = cpuprofilify().convert(arr, opts.profile)
  } catch (err) {
    // not a valid input to cpuprofilify -- maybe it's an actual cpuprofile already?
    try {
      profile = JSON.parse(arr.join('\n'))
    } catch (parseErr) {
      // if not throw the original cpuprofilify error
      throw err
    }
  }

  // at this point we have a cpuprofile
  return fromCpuProfile(profile, opts)
}

exports.svg               = svg
exports.defaultOpts       = defaultOpts
exports.defaultOptsMeta   = defaultOptsMeta
exports.processCpuProfile = processCpuProfile
exports.fromCpuProfile    = fromCpuProfile

},{"./lib/cpuprofile-processor":4,"./lib/default-opts":6,"./lib/default-opts-meta":5,"./lib/svg":9,"cpuprofilify":15}],2:[function(require,module,exports){
var format = require('util').format

function scalarReverse(s) {
  return s.split('').reverse().join('')
}

function nameHash(name) {
  // Generate a vector hash for the name string, weighting early over
  // later characters. We want to pick the same colors for function
  // names across different flame graphs.
  var vector = 0
  var weight = 1
  var max = 1
  var mod = 10
  var ord

  // if module name present, trunc to 1st char
  name = name.replace(/.(.*?)`/, '')
  var splits = name.split('')
  for (var i = 0; i < splits.length; i++) {
    ord = splits[i].charCodeAt(0) % mod
    vector += (ord / (mod++ - 1)) * weight
    max += weight
    weight *= 0.70
    if (mod > 12) break
  }

  return (1 - vector / max)
}

function color(type, hash, name) {
  var v1, v2, v3, r, g, b
  if (!type) return 'rgb(0, 0, 0)'

  if (hash) {
    v1 = nameHash(name)
    v2 = v3 = nameHash(scalarReverse(name))
  } else {
    v1 = Math.random() + 1
    v2 = Math.random() + 1
    v3 = Math.random() + 1
  }

  switch (type) {
    case 'hot':
      r = 205 + Math.round(50 * v3)
      g = 0 + Math.round(230 * v1)
      b = 0 + Math.round(55 * v2)
      return format('rgb(%s, %s, %s)', r, g, b)
    case 'mem':
      r = 0
      g = 190 + Math.round(50 * v2)
      b = 0 + Math.round(210 * v1)
      return format('rgb(%s, %s, %s)', r, g, b)
    case 'io':
      r = 80 + Math.round(60 * v1)
      g = r
      b = 190 + Math.round(55 * v2)
      return format('rgb(%s, %s, %s)', r, g, b)
    default:
      throw new Error('Unknown type ' + type)
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
  if (paletteMap[func]) return paletteMap[func]
  paletteMap[func] = color(colorTheme, hash, func)
  return paletteMap[func]
}

},{"util":14}],3:[function(require,module,exports){
var xtend = require('xtend')
var format = require('util').format
var colorMap = require('./color-map')

function oneDecimal(x) {
  return (Math.round(x * 10) / 10)
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
// Contextifier proto
function contextify(parsed, opts) {
  var time       = parsed.time
  var timeMax    = opts.timemax
  var ypadTop    = opts.fontsize * 4           // pad top, include title
  var ypadBottom = opts.fontsize * 2 + 10      // pad bottom, include labels
  var xpad       = 10                          // pad left and right
  var depthMax   = 0
  var frameHeight = opts.frameheight
  var paletteMap = {}

  if (timeMax < time && timeMax / time > 0.02) {
    console.error('Specified timemax %d is less than actual total %d, so it will be ignored', timeMax, time)
    timeMax = Infinity
  }

  timeMax = Math.min(time, timeMax)

  var widthPerTime = (opts.imagewidth - 2 * xpad) / timeMax
  var minWidthTime = opts.minwidth / widthPerTime

  function markNarrowBlocks(nodes) {
    function mark(k) {
      var val = parsed.nodes[k]
      if (typeof val.stime !== 'number') throw new Error('Missing start for ' + k)
      if ((val.etime - val.stime) < minWidthTime) {
        val.narrow = true
        return
      }

      val.narrow = false
      depthMax = Math.max(val.depth, depthMax)
    }

    Object.keys(nodes).forEach(mark)
  }

  // NodeProcessor proto
  function processNode(node) {
    var func  = node.func
    var depth = node.depth
    var etime = node.etime
    var stime = node.stime
    var factor = opts.factor
    var countName = opts.countname
    var isRoot = !func.length && depth === 0

    if (isRoot) etime = timeMax

    var samples = Math.round((etime - stime * factor) * 10) / 10
    var samplesTxt = samples.toLocaleString()
    var pct
    var pctTxt
    var escapedFunc
    var name
    var sampleInfo

    if (isRoot) {
      name = 'all'
      sampleInfo = format('(%s %s, 100%)', samplesTxt, countName)
    } else {
      pct = Math.round((100 * samples) / (timeMax * factor) * 10) / 10
      pctTxt = pct.toLocaleString()
      escapedFunc = htmlEscape(func)

      name = escapedFunc
      sampleInfo = format('(%s %s), %s%%)', samplesTxt, countName, pctTxt)
    }

    var x1 = oneDecimal(xpad + stime * widthPerTime)
    var x2 = oneDecimal(xpad + etime * widthPerTime)
    var y1 = oneDecimal(imageHeight - ypadBottom - (depth + 1) * frameHeight + 1)
    var y2 = oneDecimal(imageHeight - ypadBottom - depth * frameHeight)
    var chars = (x2 - x1) / (opts.fontsize * opts.fontwidth)
    var showText = false
    var text

    if (chars >= 3) { // enough room to display function name?
      showText = true
      text = func.slice(0, chars)
      if (chars < func.length) text = text.slice(0, chars - 2) + '..'
      text = htmlEscape(text)
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

  function processNodes(nodes) {
    var keys = Object.keys(nodes)
    var acc = new Array(keys.length)

    for (var i = 0; i < keys.length; i++) {
      acc[i] = processNode(nodes[keys[i]])
    }

    return acc
  }

  markNarrowBlocks(parsed.nodes)

  var imageHeight = (depthMax * frameHeight) + ypadTop + ypadBottom
  var ctx = xtend(opts, {
      imageheight : imageHeight
    , xpad        : xpad
    , titleX      : opts.imagewidth / 2
    , detailsY    : imageHeight - (frameHeight / 2)
  })

  ctx.nodes = processNodes(parsed.nodes)
  return ctx
}

},{"./color-map":2,"util":14,"xtend":38}],4:[function(require,module,exports){
function funcName(node) {
  var n = node.functionName
  if (node.url) n += ' ' + node.url + ':' + node.lineNumber
  return n
}

function byFramesLexically(a, b) {
  var i = 0
  var framesA = a.frames
  var framesB = b.frames
  while (true) {
    if (!framesA[i]) return -1
    if (!framesB[i]) return 1
    if (framesA[i] < framesB[i]) return -1
    if (framesB[i] < framesA[i]) return 1
    i++
  }
}

function sort(functions) {
  return functions.sort(byFramesLexically)
}

function CpuProfileProcessor(cpuprofile) {
  if (!(this instanceof CpuProfileProcessor)) return new CpuProfileProcessor(cpuprofile)

  this._profile = cpuprofile
  this._paths = []
  this._time = 0

  this._last = []
  this._tmp = {}
  this._nodes = {}
}

var proto = CpuProfileProcessor.prototype
module.exports = CpuProfileProcessor

proto._explorePaths = function _explorePaths(node, stack) {
  stack.push(funcName(node))

  if (node.hitCount) this._paths.push({ frames: stack.slice(), hitCount: node.hitCount })

  for (var i = 0; i < node.children.length; i++) {
    this._explorePaths(node.children[i], stack)
  }

  stack.pop()
}

proto._flow = function _flow(frames) {
  var lenLast = this._last.length - 1
  var lenFrames = frames.length - 1
  var i
  var lenSame
  var k

  for (i = 0; i <= lenLast; i++) {
    if (i > lenFrames) break
    if (this._last[i] !== frames[i]) break
  }
  lenSame = i

  for (i = lenLast; i >= lenSame; i--) {
    k = this._last[i] + ';' + i
    // a unique ID is constructed from "func;depth;etime"
    // func-depth isn't unique, it may be repeated later.
    this._nodes[k + ';' + this._time] = { func: this._last[i], depth: i, etime: this._time, stime: this._tmp[k].stime }
    this._tmp[k] = null
  }

  for (i = lenSame; i <= lenFrames; i++) {
    k = frames[i] + ';' + i
    this._tmp[k] = { stime: this._time }
  }
}

proto._processPath = function _processPath(path) {
  this._flow(path.frames)
  this._time += path.hitCount
  this._last = path.frames
}

proto._processPaths = function _processPaths() {
  sort(this._paths)
  for (var i = 0; i < this._paths.length; i++) {
    this._processPath(this._paths[i])
  }

  this._flow([])
}

proto.process = function process() {
  this._explorePaths(this._profile.head, [])
  this._processPaths()
  return { nodes: this._nodes, time: this._time }
}

},{}],5:[function(require,module,exports){
/* eslint-disable standard/object-curly-even-spacing, comma-spacing */
module.exports = {
    fonttype    : { type : 'string' , description : 'Font Type'                                       }
  , fontsize    : { type : 'range'  , description : 'Font Size'  , min: 6, max: 22, step: 0.1         }
  , imagewidth  : { type : 'range'  , description : 'Image Width' , min: 200, max: 2400, step: 5       }
  , frameheight : { type : 'range'  , description : 'Frame Height', min: 6, max: 40, step: 0.1         }
  , fontwidth   : { type : 'range'  , description : 'Font Width', min: 0.2, max: 1.0, step: 0.05       }
  , minwidth    : { type : 'range'  , description : 'Min Function Width', min: 0.1, max: 30, step: 0.1 }
  , countname   : { type : 'string' , description : 'Count Name'                                      }
  , colors      : { type : 'string' , description : 'Color Theme'                                     }
  , bgcolor1    : { type : 'color'  , description : 'Gradient start'                                  }
  , bgcolor2    : { type : 'color'  , description : 'Gradient stop'                                   }
  , timemax     : { type : 'number' , description : 'Time Max'                                        }
  , factor      : { type : 'number' , description : 'Scaling Factor'                                  }
  , hash        : { type : 'boolean', description : 'Color by Function Name'                          }
  , titlestring : { type : 'string' , description : 'Title'                                           }
  , nametype    : { type : 'string' , description : 'Name'                                            }
  // turns on all internals inside profile: {}, passed to cpuprofilify
  , internals: { type: 'checkbox' , description: 'Show Internals', checked: '' }
}

},{}],6:[function(require,module,exports){
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

  , profile: {
      shortStack   : true
    , unresolveds  : false
    , v8internals  : false
    , v8gc         : true
    , sysinternals : false
  }
}

},{}],7:[function(require,module,exports){
// resolved via hbsfy transform

module.exports = require('./svg.hbs')

},{"./svg.hbs":8}],8:[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda, buffer = "<g class=\"func_g "
    + escapeExpression(((helper = (helper = helpers['class'] || (depth0 != null ? depth0['class'] : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"class","hash":{},"data":data}) : helper)))
    + "\" onmouseover=\"typeof s === 'function' && s('";
  stack1 = ((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helper = (helper = helpers.samples || (depth0 != null ? depth0.samples : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"samples","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "')\" onmouseout=\"typeof c === 'function' && c()\" data-search=\"";
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

},{"hbsfy/runtime":36}],9:[function(require,module,exports){
var xtend           = require('xtend')
var contextify      = require('./contextify')
var svgTemplate     = require('./svg-template')
var defaultOpts     = require('./default-opts')

function narrowify(context, opts) {
  function processNode(n) {
    n.class = n.narrow ? 'hidden' : ''
  }

  function filterNode(n) {
    return !n.narrow
  }

  if (opts.removenarrows) context.nodes = context.nodes.filter(filterNode)
  else context.nodes.forEach(processNode)
}

module.exports =

/**
 * Creates a context from a call graph that has been collapsed (`stackcollapse-*`) and renders svg from it.
 *
 * @name flamegraph::svg
 * @function
 * @param {Array.<string>} collapsedLines callgraph that has been collapsed
 * @param {Object} opts options
 * @return {string} svg
 */
function svg(processedCpuProfile, opts) {
  opts = xtend(defaultOpts, opts)

  var context = contextify(processedCpuProfile, opts)

  narrowify(context, opts)

  return svgTemplate(context)
}

},{"./contextify":3,"./default-opts":6,"./svg-template":7,"xtend":38}],10:[function(require,module,exports){
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

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],13:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],14:[function(require,module,exports){
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
},{"./support/isBuffer":13,"_process":12,"inherits":11}],15:[function(require,module,exports){
var filterInternals       = require('trace-filter-internals')
var traceUtil             = require('./lib/trace-util')
var getConverter          = require('./lib/get-converter')
var resolveSymbols        = require('./lib/resolve-symbols')
var resolveSymbolsFromMap = require('./lib/resolve-symbols-from-map')
var xtend                 = require('xtend')
var inherits              = require('inherits')
var EventEmitter          = require('events').EventEmitter

/**
 * Creates new CpuProfilifier
 *
 * @name CpuProfilifier
 * @function
 */
function CpuProfilifier() {
  if (!(this instanceof CpuProfilifier)) return new CpuProfilifier()
  EventEmitter.call(this)
}

inherits(CpuProfilifier, EventEmitter)

var proto = CpuProfilifier.prototype
module.exports = CpuProfilifier

proto.convert =

/**
 * Converts the given trace taking according to the given opts.
 *
 * ```
 * var cpuprofilifier = require('cpuprofilifier')
 * var cpuprofile = cpuprofilifier().convert(trace)
 * fs.writeFileSync('/tmp/my.cpuprofile', JSON.stringify(cpuprofile))
 * ```
 *
 * @name CpuProfilifier::convert
 * @function
 * @param {Array.<String>} trace a trace generated via `perf script` or the `profile_1ms.d` DTrace script
 * @param {Object=} opts
 * @param {string} opts.map a map containing symbols information, if not given it will be read from /tmp/perf-<pid>.map.
 * @param {string} opts.type type of input `perf|dtrace`. If not supplied it will be detected.
 * @param {Boolean} opts.shortStack stacks that have only one line are ignored unless this flag is set
 * @param {Boolean} opts.optimizationinfo JS optimization info is removed unless this flag is set (default: false)
 * @param {Boolean} opts.unresolveds unresolved addresses like `0x1a23c` are filtered from the trace unless this flag is set (default: false)
 * @param {Boolean} opts.sysinternals sysinternals like `__lib_c_start...` are filtered from the trace unless this flag is set (default: false)
 * @param {Boolean} opts.v8internals v8internals like `v8::internal::...` are filtered from the trace unless this flag is set (default: false)
 * @param {Boolean} opts.v8gc        when v8internals are filtered, garbage collection info is as well unless this flag set  (default: true)
 * @return {Object} an cpuprofile presentation of the given trace
 */
function convert(trace, opts) {
  opts = opts || {}
  this._map = opts.map

  this._opts = xtend({ v8gc: true }, opts, { map: this._map ? 'was supplied' : 'was not supplied' })
  this.emit('info', 'Options: %j', this._opts)

  this._trace = trace
  this._traceLen = trace.length

  if (!this._traceLen) {
    this.emit('warn', 'Trace was empty, quitting')
    return
  }

  try {
    this._traceStart = traceUtil.traceStart(this._trace)

    this._converterCtr = getConverter(this._trace, this._traceStart, this._opts.type)
    this._resolveTraceInfo()
    this._tryResolveSymbols()
    this._filterInternals()

    var converter = this._converterCtr(this._filtered, this._traceStart, this._opts)
    this.emit('info', 'Converting trace of length %d', this._filteredLen)
    var converted = converter.convert()
    this.emit('info', 'Success!')
    return converted
  } catch (err) {
    this.emit('error', err)
  }
}

proto._tryResolveSymbols = function _tryResolveSymbols() {
  var res = this._map ? resolveSymbolsFromMap(this._map, this._trace) :  resolveSymbols(this.traceInfo.pid, this._trace)
  if (res.resolved) {
    this.emit('info', 'Resolved symbols in trace.')
    this._trace = res.resolved
    return
  }

  this.emit('warn', res.reason)
}

proto._resolveTraceInfo = function _resolveTraceInfo() {
  var converter = this._converterCtr(this._trace, this._traceStart, this._opts)
  converter._parseTraceInfo(this._trace[this._traceStart], true)

  this.traceInfo = {
      process   : converter._process
    , pid       : converter._pid
    , startTime : converter._startTime
    , type      : converter._type
  }

  this.emit('info', 'Trace info: %j', this.traceInfo)
}

proto._filterInternals = function _filterInternals() {
  this._filtered = this._trace
  this._filtered = filterInternals(this._trace, this._opts)
  this._filteredLen = this._filtered.length

  this.emit('info', 'Filtered %d internals from given trace', this._traceLen - this._filteredLen)
}

},{"./lib/get-converter":20,"./lib/resolve-symbols":23,"./lib/resolve-symbols-from-map":22,"./lib/trace-util":24,"events":10,"inherits":25,"trace-filter-internals":37,"xtend":38}],16:[function(require,module,exports){
var inherits  = require('inherits')
var Converter = require('./converter')

function DTraceConverter(trace, traceStart, opts) {
  if (!(this instanceof DTraceConverter)) return new DTraceConverter(trace, traceStart, opts)
  Converter.call(this, trace, traceStart, opts)

  this._frameProcessRegex = new RegExp('^(' + this._process + '|node)`')
}

inherits(DTraceConverter, Converter)
var proto = DTraceConverter.prototype

proto._framePartsRegex = /(.+?) (.+?):(\d+)$/

// Overrides
proto._parseFrame = function _parseFrame(frame) {
  var m = frame.match(this._framePartsRegex)
  if (!m) {
    return {
        functionName  : frame
      , url           : ''
      , lineNumber    : 0
      , scriptId      : 0
    }
  }

  var functionName = m[1]
  var script       = m[2]
  var lineNumber   = m[3]

  var scriptId = this._scriptIds[script]
  if (!scriptId) {
    scriptId = this._scriptId++
    this._scriptIds[script] = scriptId
  }

  if (/^[~*]\s*$/.test(functionName)) functionName += ' <anonymous>'
  return {
      functionName : functionName
    , lineNumber   : lineNumber
    , url          : script
    , scriptId     : scriptId
  }
}

proto._parseTraceInfo = function _parseTraceInfo(line, isStart) {
  var parts = line.split(/\s+/)

  if (!isStart) {
    this._endTime = (parts[2] && parts[2].slice(0, -1)) || '0'
    return
  }
  if (this._startTime && this._process && this._pid && this._type) return

  this._startTime = (parts[2] && parts[2].slice(0, -1)) || '0.0'

  this._process = parts[0]
  this._pid     = parts[1]
  this._type    = parts[3] || ''
}

proto._normalizeFrame = function _normalizeFrame(frame) {
  return this.removeOptimizationInfo(
    frame
      .trim()
      .replace(this._frameAddressRegex, '')
      .replace(this._frameProcessRegex, '')
      .replace(this._frameJSAddressRegex, '')
  )
}

proto._adjustTime = function _adjustTime(t) {
  var s = t.toString()
  // 0 is a special case
  if (s.length < 5) return s
  return s.slice(0, -3) + '.' + s.slice(4)
}

// Custom properties
proto._frameAddressRegex   = /\+0x[0-9a-fA-F]+$/
proto._frameJSAddressRegex = /0x[0-9a-fA-F]+( LazyCompile:| Function:| Script:){0,1}/
proto.type  = 'dtrace'

exports       = module.exports   = DTraceConverter
exports.ctor  = DTraceConverter
exports.proto = proto

},{"./converter":18,"inherits":25}],17:[function(require,module,exports){
var inherits  = require('inherits')
var Converter = require('./converter')
var DTraceConverter = require('./converter-dtrace').proto

function PerfConverter(trace, traceStart, opts) {
  if (!(this instanceof PerfConverter)) return new PerfConverter(trace, traceStart, opts)
  Converter.call(this, trace, traceStart, opts)
}

inherits(PerfConverter, Converter)
var proto = PerfConverter.prototype

proto._frameRegex = /^\w+\s+(?:LazyCompile:|Function:|Script:){0,1}(.+?)\W\(\S+\)$/
proto._framePartsRegex = /^(.+?)([\S.]+):(\d+)$/

// Overrides
proto._parseFrame = function _parseFrame(frame) {
  return DTraceConverter._parseFrame.call(this, frame)
}

proto._parseTraceInfo = function _parseTraceInfo(line, isStart) {
  DTraceConverter._parseTraceInfo.call(this, line, isStart)
}

proto._normalizeFrame = function _normalizeFrame(frame) {
  return this.removeOptimizationInfo(
    frame
      .trim()
      .replace(this._frameRegex, '$1')
    )
}

proto._adjustTime = function _adjustTime(t) {
  return parseInt(t.toString().slice(0, -4))
}

proto.type  = 'perf'

exports = module.exports = PerfConverter
exports.ctor  = PerfConverter
exports.proto = proto

},{"./converter":18,"./converter-dtrace":16,"inherits":25}],18:[function(require,module,exports){
var cpuprofile = require('./cpuprofile')
var traceUtil  = require('./trace-util')
var roi        = require('./remove-optimization-info')

function Converter(trace, traceStart, opts) {
  if (!(this instanceof Converter)) return new Converter(trace, traceStart, opts)
  opts = opts || {}

  this._trace = traceUtil.normalizeEmptyLines(trace)
  this._traceStart = traceStart

  this._id = 0
  this._scriptId = 0
  this._scriptIds = {}

  this._process   = undefined
  this._pid       = undefined
  this._type      = undefined
  this._startTime = undefined
  this._endTime   = undefined

  this._parseTraceInfo(trace[this._traceStart], true)

  this._head = cpuprofile.createHead(this._process, this._scriptId++)
  this._samples = []

  this._optimizationinfo = opts.optimizationinfo
  this._shortStacks = opts.shortStacks
}

var proto = Converter.prototype

// Overrides
proto._parseFrame = function _parseFrame(frame) {
  throw new Error('Need to implement _parseFrame.')
}

proto._parseTraceInfo = function _parseTraceInfo(frame) {
  throw new Error('Need to implement _parseTraceInfo.')
}

proto._normalizeFrame = function _normalizeFrame(frame) {
  throw new Error('Need to implement _normalizeFrame.')
}

proto._adjustTime = function _adjustTime(frame) {
  throw new Error('Need to implement _adjustTime.')
}

// Base methods
proto.findOrCreateNode = function findOrCreateNode(parent, nextId, stackFrame) {
  var child
  for (var i = 0; i < parent.children.length; i++) {
    child = parent.children[i]
    if (child._stackFrame === stackFrame) {
      return child
    }
  }

  var opts = this._parseFrame(stackFrame)

  var node = cpuprofile.createNode(nextId, stackFrame, opts)
  parent.children.push(node)
  return node
}

proto.objectifyStack = function objectifyStack(stackStart, stackEnd) {
  var parent = this._head
  var frame
  // cpuprofiler children are in parent->child order while stacks have parents below children
  for (var i = stackEnd; i >= stackStart; i--) {
    frame = this._normalizeFrame(this._trace[i])
    // remove frames whose description became empty after all the cleaning up
    if (!frame.length) continue

    parent = this.findOrCreateNode(parent, this._id, frame)
    this._id = Math.max(parent.id + 1, this._id)
  }

  parent.hitCount++
  this._samples.push(parent.id)
}

proto.objectifyTrace = function objectifyTrace() {
  var stackStart = 0
  var insideStack = false
  var line
  var nextLine
  var nextNextLine
  var lastTraceInfo

  for (var i = this._traceStart; i < this._trace.length; i++) {
    line = this._trace[i]
    // right above a new stack, i.e: iojs 49959 140951795: profile-1ms:
    if (!insideStack && line.length && line.charAt(0) !== ' ') {
      // a stack may be entirely empty due to previous filtering of internals
      nextLine = this._trace[i + 1]
      if (!nextLine || !nextLine.length) continue

      // skip stacks that have only one frame unless we want to keep those
      if (!this._shortStacks) {
        nextNextLine = this._trace[i + 2]
        if (!nextNextLine || !nextNextLine.length) continue
      }

      lastTraceInfo = line

      stackStart = i + 1
      insideStack = true
    }

    if (insideStack && !line.length) {
      this.objectifyStack(stackStart, i - 1)
      insideStack = false
    }
  }

  // last stack had end time since it was the last tick
  this._parseTraceInfo(lastTraceInfo, false)
  return this
}

proto.removeOptimizationInfo = function removeOptimizationInfo(name) {
  return this._optimizationinfo ? name : roi(name)
}

proto.cpuprofile = function cpuprofile() {
  return {
      typeId    : 'CPU ' + this._type
    , uid       : 1
    , title     : this._process + ' - ' + this._type
    , head      : this._head
    , startTime : this._adjustTime(this._startTime)
    , endTime   : this._adjustTime(this._endTime)
    , samples   : this._samples
  }
}

proto.convert = function convert() {
  return this.objectifyTrace().cpuprofile()
}

exports = module.exports = Converter
exports.ctor  = Converter
exports.proto = proto

},{"./cpuprofile":19,"./remove-optimization-info":21,"./trace-util":24}],19:[function(require,module,exports){
exports.createHead = function createHead(execname, id) {
  return {
      functionName  : execname
    , url           : ''
    , lineNumber    : 0
    , callUiD       : 0   // todo: what is this and do we need it?
    , bailoutReason : ''
    , id            : id
    , scriptId      : 0
    , hitCount      : 0
    , children      : []
  }
}

exports.createNode = function createNode(id, stackFrame, opts) {
  return {
      functionName  : opts.functionName
    , url           : opts.url           || ''
    , lineNumber    : opts.lineNumber    || 0
    , bailoutReason : opts.bailoutReason || ''
    , id            : id
    , scriptId      : opts.scriptId      || 0
    , hitCount      : 0
    , children      : []
    , _stackFrame   : stackFrame
  }
}

},{}],20:[function(require,module,exports){
var dtraceConverterCtr      = require('./converter-dtrace')
var perfConverterCtr        = require('./converter-perf')

var dtraceRegex = /^\S+ \d+ \d+: \S+:\s*$/
var perfRegex = /^\S+\s+\d+(\s+\[\d+])?\s+\d+\.\d+:(\s+\d+)? \S+:\s*$/

module.exports = function getConverter(trace, traceStart, type) {
  if (type) {
    switch (type) {
      case 'perf'   : return perfConverterCtr
      case 'dtrace' : return dtraceConverterCtr
      default       : throw new Error('Unknown input type : ' + type)
    }
  }

  var line = trace[traceStart]

  if (dtraceRegex.test(line)) return dtraceConverterCtr
  if (perfRegex.test(line)) return perfConverterCtr

  throw new Error('Unable to detect input type for \n"' + line + '"')
}

},{"./converter-dtrace":16,"./converter-perf":17}],21:[function(require,module,exports){
var regex = /^\W*[*~]/
  // replacement indicates that this was either ~ or * and also doesn't
  // break tools that look for ~ to identify JS
var replacement = '~*'

module.exports = function removeOptimizationInfo(functionName) {
  return functionName.replace(regex, replacement)
}

},{}],22:[function(require,module,exports){
var resolveJITSymbols = require('resolve-jit-symbols')

module.exports = function resolveSymbolsFromMap(map, trace) {
  var resolver = resolveJITSymbols(map)
  var resolved = resolver.resolveMulti(trace)

  return { resolved: resolved }
}

},{"resolve-jit-symbols":26}],23:[function(require,module,exports){
// no op function since we cannot resolve symbols in the browser (no access to .map file
module.exports = function resolveSymbols(pid, trace) { return trace }

},{}],24:[function(require,module,exports){
exports.normalizeEmptyLines = function normalizeEmptyLines(trace) {
  // need *exactly* ONE empty line after last stack
  var l = trace.length - 1
  while (l > 0 && trace[l].trim() === '') l--
  trace.length = l + 2
  trace[l + 1] = ''
  return trace
}

exports.traceStart = function traceStart(lines) {
  for (var i = 0; i < lines.length; i++) {
    // ignore empty lines and comments starting with #
    if (lines[i] && lines[i].length && lines[i][0] !== '#') return i
  }
}

},{}],25:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],26:[function(require,module,exports){
'use strict';
var prettyTrace = require('pretty-trace');

var instrumentsCsvRegex = prettyTrace.regexes.instruments.csv.regex;


var hexAddressRegex = /0x([0-9A-Fa-f]{2,12})/
  , lldb_backtraceRegex = /(:?0x(?:(?:\d|[abcdefABCDEF]){0,2})+) +in +(:?0x(?:(?:\d|[abcdefABCDEF]){0,2})+)/
// TODO:  faster IMO, not working currently ATM
//  , lldb_backtraceRegex = /0x[0-9A-Fa-f]{2,12} +in 0x[0-9A-Fa-f]{2,12}/

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
  if (!m) return null;
  
  var matchStackTrace = line.match(lldb_backtraceRegex);
  var res;
  if (matchStackTrace) { 
    // lldb backtrace
    return { address: matchStackTrace[2], include: false }
  }
  var include = !instrumentsCsvRegex.test(line);

  return m && { address: m[0], include: include }
}

/**
 * Resolves all symbols in a given stack and replaces them accordingly
 * 
 * @name JITResolver::resolveMulti
 * @function
 * @param {Array.<String>|String} stack string of stack or lines of stack
 * @param {function=} getHexAddress allows overriding the function used to find a hex address on each line, returns `{ address: 0x000, include: true|false }`
 * @return {Array.<String>|String} the stack with symbols resolved in the same format that the stack was given, either as lines or one string
 */
proto.resolveMulti = function resolveMulti(stack, getHexAddress) {
  getHexAddress = getHexAddress || defaultGetHexAddress;
  var self = this;

  var isLines = Array.isArray(stack)
  var lines = isLines ? stack : stack.split('\n')

  function processLine(line) {
    var replacement;
    var match = getHexAddress(line);
    if (!match || !match.address) return line;

    var resolved = self.resolve(match.address);
    if (!resolved) return line;

    return line.replace(match.address, match.include ? match.address + ' ' + resolved.symbol : resolved.symbol);
  }
  
  var processedLines = lines.map(processLine);

  return isLines ? processedLines : processedLines.join('\n');
}

/**
 * RegExp used to match memory addresses.
 * 
 * @name JITResolver::hexAddressRegex
 */
proto.hexAddressRegex  = hexAddressRegex;

/**
 * RegExp used to match memory lldb backtraces of the form `#1 0x001 in 0x001 ()`
 * When calling `var m = s.match(regex)` 
 * `m[1]` contains first matched address and `m[2]` contains second matched address.
 * 
 * @name JITResolver::lldb_backtraceRegex
 */
proto.lldb_backtraceRegex = lldb_backtraceRegex;

},{"pretty-trace":28}],27:[function(require,module,exports){
// ColorCodes explained: http://www.termsys.demon.co.uk/vtansi.htm
'use strict';

var colorNums = {
      white         :  37
    , black         :  30
    , blue          :  34
    , cyan          :  36
    , green         :  32
    , magenta       :  35
    , red           :  31
    , yellow        :  33
    , brightBlack   :  90
    , brightRed     :  91
    , brightGreen   :  92
    , brightYellow  :  93
    , brightBlue    :  94
    , brightMagenta :  95
    , brightCyan    :  96
    , brightWhite   :  97
    }
  , backgroundColorNums = {
      bgBlack         :  40
    , bgRed           :  41
    , bgGreen         :  42
    , bgYellow        :  43
    , bgBlue          :  44
    , bgMagenta       :  45
    , bgCyan          :  46
    , bgWhite         :  47
    , bgBrightBlack   :  100
    , bgBrightRed     :  101
    , bgBrightGreen   :  102
    , bgBrightYellow  :  103
    , bgBrightBlue    :  104
    , bgBrightMagenta :  105
    , bgBrightCyan    :  106
    , bgBrightWhite   :  107
    } 
  , colors = {};


Object.keys(colorNums).forEach(function (k) {
  colors[k] = function (s) { 
    return '\u001b[' + colorNums[k] + 'm' + s + '\u001b[39m';
  };
});

Object.keys(backgroundColorNums).forEach(function (k) {
  colors[k] = function (s) { 
    return '\u001b[' + backgroundColorNums[k] + 'm' + s + '\u001b[49m';
  };
});

module.exports = colors;

},{}],28:[function(require,module,exports){
'use strict';
var colors = require('ansicolors');

/**
 * Regexes used to match debug traces created by tools like lldb.
 * 
 * @name prettyTrace::regexes::lldb
 */
var lldb = {
      frameAddInSymAtLoc: {
        //     The result of copying Xcode stracktrace from the side bar
        //     #10 0x1234a23b in node::Parser::on_headers_complete(http_parser*) at node_http_parser.cc:241
        desc: '#num 0x0000 in symbol() at file.cc'
      , regex:  /^(:?#\d+\W+)(:?0x(?:(?:\d|[abcdefABCDEF]){0,2})+)(:? +in +)(:?.+?)(:? +at +)(:?.+)$/m
      , matches: [ 'frame', 'address', 'in', 'symbol', 'at', 'file' ]

    }
  , frameAddInSymLoc: {
        //     The result of copying Xcode stracktrace from the side bar
        //     #9  0x00001226b65fe54b in LazyCompile:~watchIndex /Users/thlorenz/dev/talks/memory-profiling/example/app.js:32 ()
        desc: '#num 0x000 in symbol() file.js'
      , regex:  /^(:?#\d+\W+)(:?0x(?:(?:\d|[abcdefABCDEF]){0,2})+)(:? +in +)(:?.+?)(:? .+)$/m
      , matches: [ 'frame', 'address', 'in', 'symbol', 'file' ]

    }
  , frameAddSymAtLoc: {
        //    frame #0: 0x00000001009c096c node_g`uv_fs_read(loop=0x0000000100f4b980, req=0x00007fff5fbf4fa8, file=21, bufs=0x00007fff5fbf51d0, nbufs=1, off=-1, cb=0x0000000000000000) + 44 at fs.c:1037
        //    frame #1: 0x00000001009343ce node_g`node::Read(args=0x00007fff5fbf52b0) + 1502 at node_file.cc:922
        //    frame #6: 0x00003d278f8060bb
        desc: 'frame #x 0x0000 symbol(..) at file.c:100 OR frame #x: 0x0000'
      , regex: /^(:?[^#]*?#\d+[:]{0,1}\W+)(:?0x(?:(?:\d|[abcdefABCDEF]){0,2})+)(:?.*?)(?:(:?\W+at\W+)(:?[^:]+:\d.+)){0,1}$/m
      , matches: [ 'frame', 'address', 'symbol', 'at', 'file' ]
    }
  , frameSymLoc: {
        //    frame #10: LazyCompile:~onrequest /Users/thlorenz/dev/talks/jit/examples/fs-read-sync/index.js:12
        //    frame #11: LazyCompile:~emit events.js:70
        //    frame #16: Stub:JSEntryStub
        desc: 'frame #x LazyCompile:~symbol(..) file.js:100'
      , regex: /^(:?[^#]*?#\d+[:]{0,1}\W+)(:?[^/ ]+)(:?.+){0,1}$/m
      , matches: [ 'frame', 'symbol', 'file' ]
    }
}

/**
 * Regexes used to match callgraphs generated with Mac Instruments.
 * 
 * @name prettyTrace::regexes::instruments
 */
var instruments = {
  csv: {
    // Captures include white space to maintain indentation
    //                        67.0ms   97.1%,0, ,     node::TimerWrap::OnTimeout(uv_timer_s*)
    //                        67.0ms   97.1%,0, ,         0x38852ff1decf
    desc: 'XX.Xms XX.X%,,X , address OR symbol'
  , regex: /^(:?[0-9.]+)(:?ms|s)(:?\W+[0-9.]+%),\d+,\W+,(:?\W+0x(?:(?:\d|[abcdefABCDEF]){2})+){0,1}(:?.+?){0,1}$/m
  , matches: [ 'time', 'timeUnit', 'percent', 'address', 'symbol' ]
  }
}

/**
 * Regexes used to match callgraphs generated running Linux perf, i.e. `perf script`.
 * 
 * @name prettyTrace::regexes::perf
 */
var perf = {
  script: {
      //                        89dd46 v8::internal::UseIterator::UseIterator(v8::internal::LInstruction*) (/usr/local/bin/node)
      desc: 'address symbol (process)'
    , regex:  /^(:?\W+(?:(?:\d|[abcdefABCDEF]){2})+){0,1}\W+(:?.+?){1}(:?\([^()]+\)){0,1}$/m
    , matches: ['address', 'symbol', 'process' ]
  }
}

exports.line = 

/**
 * Prettifies the given line.
 * 
 * @name prettyTrace::line
 * @function
 * @param {string}   line           the line to be prettified
 * @param {Object}   theme          theme that specifies how to prettify a trace
 * @param {function} theme.raw      invoked to surround an unparsable line
 * @param {function} theme.frame    invoked to surround the frame number
 * @param {function} theme.address  invoked to surround the hex address
 * @param {function} theme.symbol   invoked to surround the symbol corresponding to the address, i.e. a function name
 * @param {function} theme.location invoked to surround the location in the file at which the symbol is found
 * @return {string}  prettified line
 */
function prettyLine(line, theme) {
  var pat;
  if (!line) throw new Error('Please supply a line');
  if (!theme) throw new Error('Please supply a theme');

  pat = lldb.frameAddInSymAtLoc;
  if (pat.regex.test(line)) { 
    return line.replace(pat.regex, function (match, frame, address, in_, symbol, at_, location) {
      return  theme.frame(frame)
            + theme.address(address)
            + in_ + theme.symbol(symbol)
            + at_ + theme.location(location)
    })
  }

  pat = lldb.frameAddInSymLoc;
  if (pat.regex.test(line)) { 
    return line.replace(pat.regex, function (match, frame, address, in_, symbol, location) {
      return  theme.frame(frame)
            + theme.address(address)
            + in_ + theme.symbol(symbol)
            + theme.location(location)
    })
  }

  pat = lldb.frameAddSymAtLoc;
  if (pat.regex.test(line)) { 
    return line.replace(pat.regex, function (match, frame, address, symbol, at_, location) {
      return  theme.frame(frame)
            + theme.address(address)
            + (theme.symbol(symbol || ''))
            + (at_ || '') + (theme.location(location || ''))
    })
  }

  pat = lldb.frameSymLoc;
  if (pat.regex.test(line)) { 
    return line.replace(pat.regex, function (match, frame, symbol, location) {
      return  theme.frame(frame)
            + (theme.symbol(symbol || ''))
            + (theme.location(location || ''))
    })
  }

  pat = instruments.csv;
  if (pat.regex.test(line)) { 
    return line.replace(pat.regex, function (match, time, timeUnit, percent, address, symbol) {
      return theme.frame(time) + ' ' 
           + timeUnit 
           + theme.location(percent) + ' ' 
           + (address ? theme.address(address) : '') 
           + (symbol ? theme.symbol(symbol) : '')
    })
  }

  pat = perf.script;
  if (pat.regex.test(line)) { 
    return line.replace(pat.regex, function (match, address, symbol, process) {
      return  theme.address(address) + ' '
            + theme.symbol(symbol) + ' '
            + theme.location(process);
    })
  }
  return theme.raw(line);
}

exports.lines = 

/**
 * Prettifies multiple lines.
 * 
 * @name prettyTrace::lines
 * @function
 * @param {Array.<string>} lines lines to be prettified
 * @param {Object} theme theme that specifies how to prettify a trace @see prettyTrace::line
 * @return {Array.<string>} the prettified lines
 */
function prettyLines(lines, theme) {
  if (!lines || !Array.isArray(lines)) throw new Error('Please supply an array of lines');
  if (!theme) throw new Error('Please supply a theme');

  function prettify(line) {
    if (!line) return null;
    return exports.line(line, theme);
  }

  return lines.map(prettify);
}

/**
 * A theme that colorizes the given trace using ANSI color codes.
 * 
 * @name prettyTrace::terminalTheme
 */
exports.terminalTheme = {
    raw      : colors.white
  , frame    : colors.brightGreen
  , address  : colors.brightBlack
  , symbol   : colors.brightBlue
  , location : colors.brightBlack
}

function spanClass(clazz, link) {
  return function span(x) {
    if (!x) return '';
    if (link) { 
      x = '<a href="file://' + x.split(':')[0] +'">' + x + '</a>';
    }
    return '<span class="' + clazz + '">' + x + '</span>';
  }
}

/**
 * A theme that surrounds the given trace using with spans classed `trace-*` in order to allow styling with CSS.
 * 
 * @name prettyTrace::htmlTheme
 */
exports.htmlTheme = {
    raw      : spanClass('trace-raw')
  , frame    : spanClass('trace-frame')
  , address  : spanClass('trace-address')
  , symbol   : spanClass('trace-symbol')
  , location : spanClass('trace-location', true)
}

exports.regexes = { 
    lldb        : lldb
  , perf        : perf
  , instruments : instruments
}

},{"ansicolors":27}],29:[function(require,module,exports){
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
},{"./handlebars/base":30,"./handlebars/exception":31,"./handlebars/runtime":32,"./handlebars/safe-string":33,"./handlebars/utils":34}],30:[function(require,module,exports){
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
},{"./exception":31,"./utils":34}],31:[function(require,module,exports){
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
},{}],32:[function(require,module,exports){
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
},{"./base":30,"./exception":31,"./utils":34}],33:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],34:[function(require,module,exports){
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
},{"./safe-string":33}],35:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":29}],36:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":35}],37:[function(require,module,exports){
'use strict';

var v8internalsRegex = new RegExp(
    'node::Start\\(|node`(?:start\\+)?0x[0-9A-Fa-f]+'                                // node startup
  + '|v8::internal::|v8::Function::Call|v8::Function::NewInstance'                   // v8 internal C++
  + '|Builtin:|Stub:|StoreIC:|LoadIC:|LoadPolymorphicIC:|KeyedLoadIC:'               // v8 generated boilerplate
  + '|<Unknown Address>|_platform_\\w+\\$VARIANT\\$|DYLD-STUB\\$|_os_lock_spin_lock' // unknown and lower level things
  + '|\\(root'
);

var sysinternalsRegex = /^\W+dyld|__libc_start/;

var unresolvedsRegex = /^\W*0x[0-9A-Fa-f]+\W*$/ // lonely unresolved hex address
var v8gcRegex = /v8::internal::Heap::Scavenge/ 

module.exports = 
  
/**
 * Filters all internals specified via opts from the given lines.
 * 
 * @name filterInternals
 * @function
 * @param {Array.<string>} lines to filter lines from that have internals
 * @param {Object=} opts specify which kind of internals to keep
 * @param {Boolean} opts.unresolveds unresolved addresses like `0x1a23c` are filtered from the trace unless this flag is set (default: false)
 * @param {Boolean} opts.sysinternals sysinternals like `__lib_c_start...` are filtered from the trace unless this flag is set (default: false)
 * @param {Boolean} opts.v8internals v8internals like `v8::internal::...` are filtered from the trace unless this flag is set (default: false)
 * @param {Boolean} opts.v8gc        when v8internals are filtered, garbage collection info is as well unless this flag set  (default: true)
 * @return {Array.<string>} lines that passed through the filter
 */
function filterInternals(lines, opts) {
  opts = opts || {};
  var unresolveds  = opts.unresolveds
    , sysinternals = opts.sysinternals
    , v8internals  = opts.v8internals
    , v8gc         = opts.v8gc

  function notInternal(l) {
    if (v8gc && v8gcRegex.test(l)) return true;
    return (unresolveds   || !unresolvedsRegex.test(l)) 
        && (sysinternals  || !sysinternalsRegex.test(l))
        && (v8internals   || !v8internalsRegex.test(l))
  }

  return lines.filter(notInternal);
}

},{}],38:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[1])(1)
});
