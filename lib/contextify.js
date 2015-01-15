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
      , showText  : showText
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
