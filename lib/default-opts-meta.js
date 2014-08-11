'use strict';

module.exports = {
    fonttype    : { type: 'text'    , description: 'Font Type'              }
  , fontsize    : { type: 'number'  , description: 'Text Size'              }
  , imagewidth  : { type: 'number'  , description: 'Image Width'            }
  , frameheight : { type: 'number'  , description: 'Frame Height'           }
  , fontwidth   : { type: 'number'  , description: 'Font Width'             }
  , minwidth    : { type: 'number'  , description: 'Min Function Width'     }
  , countname   : { type: 'text'    , description: 'Count Name'             }
  , colors      : { type: 'text'    , description: 'Color Theme'            }
  , bgcolor1    : { type: 'color'   , description: 'Bgcolor Gradient start' }
  , bgcolor2    : { type: 'color'   , description: 'Bgcolor Gradient stop'  }
  , timemax     : { type: 'number'  , description: 'Time Max'               }
  , factor      : { type: 'number'  , description: 'Scaling Factor'         }
  , hash        : { type: 'checkbox', description: 'Color by Function Name' }
  , titletext   : { type: 'text'    , description: 'Title'                  }
  , nametype    : { type: 'text'    , description: 'Name'                   }
}
