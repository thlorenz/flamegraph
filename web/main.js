'use strict';

var flamegraph = require('flamegraph');
var optsTemplate = require('./opts-template.hbs');
var flamegraphEl = document.getElementById('flamegraph');
var inputfileEl = document.getElementById('inputfile')
var inputfileButtonEl = document.getElementById('inputfile-button')
var refreshButtonEl = document.getElementById('refresh-button')
var optionsEl = document.getElementById('options');
var currentFolded;

function renderOptions() {
  var opts = flamegraph.defaultOpts
    , meta = flamegraph.defaultOptsMeta;

  console.dir(opts);
  var context = Object.keys(meta)
    .reduce(function (acc, k) {
      var type = meta[k].type;
      if (type === 'boolean') type = 'checkbox';
      if (type === 'string') type = 'text';
      return acc.concat({
          name         : k
        , value        : opts[k]
        , type         : type 
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

  console.dir(getOptions());
}

function getOptions() {
  var meta = flamegraph.defaultOptsMeta;

  return Object.keys(meta)
    .reduce(function (acc, k) {
      var el = document.getElementById(k);
      var val = el.value;
      if (meta[k].type === 'number') {
        val = val.length ? parseFloat(val) : Infinity;
      } else if (meta[k].type === 'boolean') {
        val = val.length ? Boolean(val) : false; 
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

function showRefreshButton() {
  refreshButtonEl.classList.remove('hidden');
}

function render(arr) {
  var opts = getOptions();
  console.dir(opts);

  var svg;
  try {
    currentFolded = arr;
    svg = flamegraph(arr, opts);
    flamegraphEl.innerHTML= svg;
    hookHoverMethods();
  } catch (err) {
    flamegraphEl.innerHTML = '<br><p class="error">' + err.toString() + '</p>';
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
    render(arr);
    showRefreshButton();
  });
}

function refresh() {
  if (!currentFolded) return;
  render(currentFolded);

}

// Event Listeners
inputfileEl.addEventListener('change', onFile);
inputfileButtonEl.onclick = function () {
  inputfileEl.click();
}
refreshButtonEl.onclick = refresh;

// Setup 
renderOptions();
