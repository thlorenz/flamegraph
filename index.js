'use strict';

var through = require('through2')
  , detectInputType = require('./lib/detect-inputtype')

exports = module.exports =

/**
 * Converts a stream of call graph lines into an svg document.
 *
 * @name flamegraph
 * @function
 * @param {ReadableStream} stream that will emit the call graph lines to be parsed
 * @param {Object} opts objects that affect the visualization
 * @param {string} opts.inputtype   the type of callgraph `instruments | `
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
 * @return {ReadableStream} svg stream
 */
function flamegraph(stream, opts) {
  opts = opts || {};

  var inputType = opts.inputtype;
  if (!inputType) {
    throw new Error('When using the streaming interface, the input type is required');
    // If no input type was given we need to detect it which means:
    // - first converting into an array in order to detect, i.e. by first ine
    // - second collapse and generate svg
    // - third convert back to a stream since that is what the API dictates
    
    // Possible improvement: if all detectors can work with just the first line we may optimize this:
    // - keep it streaming and use first line for detector
    // - push data back (http://nodejs.org/api/stream.html#stream_readable_unshift_chunk)
    // - pipe stream into collapser

  }

  var chunks = [];

  function onread (chunk, enc, cb) {
    chunks.push(chunk);
    cb();
  }

  function onflush(cb) {
    var lines = Buffer.concat(chunks).toString().split('\n')
      , svg;
    try {
      svg = exports.svg(lines, opts)
    } catch (err) {
      return cb(err);
    }
    this.push(svg);
    cb();
  }

  // Need to take stream as input here, I have not found a way to make this work and allow
  // `stream.pipe(flamegraph('instruments')).pipe(stdout)` instead.
  // So a little less nice API, but at least it works
  var out = stream
    .on('error', function(err) { out.emit('error', err) })
    .pipe(exports.stackCollapse())
    .on('error', function(err) { out.emit('error', err) })
    .pipe(through(onread, onflush))

  return out;
}

exports.fromArray = 

/**
 * Converts an array of call graph lines into an svg document.
 *
 * @name flamegraph::fromArray
 * @function
 * @param {Array.<string>} arr lines to collapse
 * @param {Object} opts same as `flamegraph` function except that `inputtype` is detected if not given 
 * @return {string} svg
 */
function fromArray (arr, opts) {
  opts = opts || {};
  var collapsed = exports.stackCollapseFromArray(arr, opts.inputtype);
  return exports.svg(collapsed, opts);
}

exports.stackCollapse = require('./lib/stackcollapse')
exports.stackCollapseFromArray = 

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
  inputType = inputType || detectInputType(arr);
  if (!inputType) throw new Error('No input type given and unable to detect it for the given input!');

  return exports.stackCollapse.array(inputType, arr);
}

exports.svg = require('./lib/svg');
