'use strict';

var flamegraph = require('flamegraph');
var optsTemplate = require('./opts-template.hbs');
var flamegraphEl = document.getElementById('flamegraph');
var inputfileEl = document.getElementById('inputfile')
var inputfileButtonEl = document.getElementById('inputfile-button')
var optionsEl = document.getElementById('options');

function renderOptions() {
  var opts = flamegraph.defaultOpts
    , meta = flamegraph.defaultOptsMeta;

  var context = Object.keys(meta)
    .reduce(function (acc, k) {
      return acc.concat({
          name         : k
        , value        : opts[k]
        , type         : meta[k].type
        , description : meta[k].description
      });
    }, []);
  var html = optsTemplate(context);
  optionsEl.innerHTML = html;

  // Need to set value in JS since it's not picked up when set in html that is added to DOM afterwards
  Object.keys(meta)
    .forEach(function (k) {
      var val = opts[k];
      var el = document.getElementById(k);
      el.value = val;
    });
}

function getOptions() {
  var meta = flamegraph.defaultOptsMeta;

  return Object.keys(meta)
    .reduce(function (acc, k) {
      var el = document.getElementById(k);
      var val = el.value;
      if (meta[k].type === 'number') {
        val = val.length ? parseInt(val, 10) : Infinity;
      }
      acc[k] = val;
      return acc;
    }, {});
}

function hookHoverMethods() {
  var details = document.getElementById("details").firstChild;
  window.s = function s(info) { 
    details.nodeValue = "Function: " + info; 
  }
  window.c = function c() { 
    details.nodeValue = ' '; 
  }
}

function readFile(file, cb) {
  var fileReader = new FileReader();
  fileReader.readAsText(file, 'utf-8');
  fileReader.onload = function onload(err) {
    cb(err, fileReader.result);
  }
}

function onFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  readFile(file, function (e) {
    var arr = e.target.result.split('\n');
    var opts = {} //getOptions();
    var svg;
    try {
      svg = flamegraph(arr, opts);
      flamegraphEl.innerHTML= svg;
     hookHoverMethods();
    } catch (err) {
      flamegraphEl.innerHTML = '<br><p class="error">' + err.toString() + '</p>';
    }
  });
}

inputfileEl.addEventListener('change', onFile);
inputfileButtonEl.onclick = function () {
  inputfileEl.click();
}

renderOptions();
