'use strict';

var hbs             = require('handlebars')
  , fs              = require('fs')
  , path            = require('path')
  , svgTemplateFile = path.join(__dirname, 'svg.hbs')
  , svgHbs          = fs.readFileSync(svgTemplateFile, 'utf8')
  , svgTemplate     = hbs.compile(svgHbs);

/**
 * The template function to be used server side.
 * 
 * @name svgTemplate
 * @private
 * @function
 */
module.exports = svgTemplate;
