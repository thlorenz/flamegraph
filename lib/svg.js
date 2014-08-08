'use strict';

var xtend = require('xtend')
  , format = require('util').format;

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

// could be styled via css so we can change the look dynamically
var defaultConfig = {
  // css
    fonttype    : 'Verdana'
  , fontsize    : 12            // base text size
  , imagewidth  : 1200          // max width, pixels
  , frameheight : 16            // max height is dynamic
  , fontwidth   : 0.59          // avg width relative to fontsize
  , minwidth    : 0.1           // min function width, pixels
  , countname   : 'samples'     // what are the counts in the data?
  , colors      : 'hot'         // color theme
  , bgcolor1    : '#eeeeee'     // background color gradient start
  , bgcolor2    : '#eeeeb0'     // background color gradient stop
  , timemax     : Infinity      // (override the) sum of the counts
  , factor      : 1             // factor to scale counts by
  , hash        : 0             // color by function name
  , palette     : 0             // if we use consistent palettes (default off)
  , palette_map : {}            // palette map hash
  , pal_file    : 'palette.map' // palette map file name
  , titletext   : 'Flame Graph' // centered heading
  , nametype    : 'Function:'   // what are the names in the data?
}

var lines = [
    '<Unnamed Thread> 0x155005 1673'
  , '<Unnamed Thread> 0x155005;start 1663'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**) 1663'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run 1663'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll 1660'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io 1608'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io;node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type) 1603'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io;node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type);node::AsyncWrap::MakeCallback(v8::Handle<v8::Function>, int, v8::Handle<v8::Value>*) 1602'
];

var regexp = /^(.*)\s+(\d+(?:\.\d*)?)$/;
var opts = defaultConfig;

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

  sort(lines).forEach(processLine);
  flow(tmp, nodes, last, [], time);

  if (ignored) console.error('Ignored %d lines with invalid format');
  if (!time) throw new Error('No stack counts found!');

  return { nodes: nodes, time: time, ignored: ignored };
}

function oneDecimal(x) {
  return (Math.round(x * 10) / 10);
}

function scalarReverse(s) {
  return s.split('').reverse().join('');
}

// color map
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
    max += 1 * weight;
    weight *= 0.7;
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

function colorMap(paletteMap, colorTheme, hash, func) {
  if (paletteMap[func]) return paletteMap[func];
  paletteMap[func] = color(colorTheme, hash, func);
  return paletteMap[func];
}

// end color map

function htmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function processNodes(parsed) {
  var time       = parsed.time
    , timeMax    = opts.timemax
    , ypadTop    = opts.fontsize * 4           // pad top, include title
    , ypadBottom = opts.fontsize * 2 + 10      // pad bottom, include labels
    , xpad       = 10                          // pad left and right
    , depthMax   = 0
    , frameHeight = opts.frameheight
    , imageHeight = (depthMax * frameHeight) + ypadTop + ypadBottom
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
      , rect_fill : colorMap(paletteMap, opts.colors, true /* use hash */, func)
      , showText  : showText
      , text      : text
      , text_x    : x1 + 3
      , text_y    : 3 + (y1 + y2) / 2
    }
  }

  var nodes = pruneNarrowBlocks();

  var ctx = xtend(opts, {});
  ctx.nodes = Object.keys(nodes)
    .reduce(function (acc, k) {
      acc.push(processNode(nodes[k]));
      return acc;
    }, []);
  return ctx;
} 

var hbs = require('handlebars')
  , fs = require('fs')
  , path = require('path')
  , svgTemplateFile = path.join(__dirname, 'svg.hbs')
  , svgHbs = fs.readFileSync(svgTemplateFile, 'utf8')
  , svgTemplate = hbs.compile(svgHbs);

var parsed = parseInput(lines)
  , context = processNodes(parsed)


var svg = svgTemplate(context);
fs.writeFileSync(__dirname + '/../test/results/simple.svg', svg);
