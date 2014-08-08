'use strict';

var through = require('through2');

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

exports = module.exports =

/**
 * Converts a stream of call graph lines into an svg document.
 *
 * @name flamegraph
 * @function
 * @param {ReadableStream} stream that will emit the call graph lines to be parsed
 * @param {string} inputType the type of callgraph `instruments | `
 * @param {Object}  opts objects that affect the visualization
 * @param {string=} opts.fonttype                                      default: `'Verdana'`
 * @param {number=} opts.fontsize    base text size                    default: `12`
 * @param {number=} opts.imagewidth  max width, pixels                 default: `1200`
 * @param {number=} opts.frameheight max height is dynamic             default: `16.0`
 * @param {number=} opts.fontwidth   avg width relative to fontsize    default: `0.59`
 * @param {number=} opts.minwidth    min function width, pixels        default: `0.1`
 * @param {string=} opts.countname   what are the counts in the data?  default: `'samples'`
 * @param {string=} opts.colors      color theme                       default: `'hot'`
 * @param {string=} opts.bgcolor1    background color gradient start   default: `'#eeeeee'`
 * @param {string=} opts.bgcolor2    background color gradient stop    default: `'#eeeeb0'`
 * @param {number=} opts.timemax     (override the) sum of the counts  default: `Infinity`
 * @param {number=} opts.factor      factor to scale counts by         default: `1`
 * @param {boolean=} opts.hash       color by function name            default: `true`
 * @param {string=} opts.titletext   centered heading                  default: `'Flame Graph'`
 * @param {string=} opts.nametype    what are the names in the data?   default: `'Function:'`
 */
function flamegraph(stream, inputType, opts) {
  var collapse;

  switch(inputType) {
    case 'instruments':
      collapse = exports.stackCollapseInstruments
      break;
    default:
      throw new Error('Unsupported input type ' + inputType);
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
    .pipe(collapse())
    .on('error', function(err) { out.emit('error', err) })
    .pipe(through(onread, onflush))

  return out;
}

exports.svg = require('./lib/svg');
exports.stackCollapseInstruments = require('./lib/stackcollapse-instruments')


// Test
if (!module.parent && typeof window === 'undefined') {

var instream = require('fs').createReadStream(__dirname + '/test/fixtures/instruments.csv');
  exports(instream, 'instruments').pipe(process.stdout);
}
