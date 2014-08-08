'use strict';

module.exports = {
  // css
    fonttype    : 'Verdana'
  , fontsize    : 12            // base text size
  , imagewidth  : 1200          // max width, pixels
  , frameheight : 15.0          // max height is dynamic  
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
