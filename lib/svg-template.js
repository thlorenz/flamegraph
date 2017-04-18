var hbs             = require('handlebars')
var fs              = require('fs')
var path            = require('path')
var svgTemplateFile = path.join(__dirname, 'svg.hbs')
var svgHbs          = fs.readFileSync(svgTemplateFile, 'utf8')
var svgTemplate     = hbs.compile(svgHbs)

/**
 * The template function to be used server side.
 *
 * @name svgTemplate
 * @private
 * @function
 */
module.exports = svgTemplate
