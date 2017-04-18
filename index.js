var svg                 = require('./lib/svg')
var defaultOpts         = require('./lib/default-opts')
var defaultOptsMeta     = require('./lib/default-opts-meta')
var cpuprofilify        = require('cpuprofilify')
var cpuprofileProcessor = require('./lib/cpuprofile-processor')

function fromCpuProfile(cpuprofile, opts) {
  var processed = cpuprofileProcessor(cpuprofile, opts).process()
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

exports.svg             = svg
exports.defaultOpts     = defaultOpts
exports.defaultOptsMeta = defaultOptsMeta
