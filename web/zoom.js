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
