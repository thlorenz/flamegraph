'use strict';

module.exports = {
    fonttype    : { type: 'text'    , description: 'font type'                       }
  , fontsize    : { type: 'number'  , description: 'base text size'                  }
  , imagewidth  : { type: 'number'  , description: 'max width, pixels'               }
  , frameheight : { type: 'number'  , description: 'max height is dynamic'           }
  , fontwidth   : { type: 'number'  , description: 'avg width relative to fontsize'  }
  , minwidth    : { type: 'number'  , description: 'min function width, pixels'      }
  , countname   : { type: 'text'    , description: 'the counts in the data'          }
  , colors      : { type: 'text'    , description: 'color theme'                     }
  , bgcolor1    : { type: 'color'   , description: 'background color gradient start' }
  , bgcolor2    : { type: 'color'   , description: 'background color gradient stop'  }
  , timemax     : { type: 'number'  , description: 'sum of the counts'               }
  , factor      : { type: 'number'  , description: 'factor to scale counts by'       }
  , hash        : { type: 'checkbox', description: 'color by function name'          }
  , titletext   : { type: 'text'    , description: 'title'                           }
  , nametype    : { type: 'text'    , description: 'the names in the data'           }
}
