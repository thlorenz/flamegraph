'use strict';

module.exports = {
    fonttype    : { type : 'string'  , description : 'Font Type'              }
  , fontsize    : { type : 'number'  , description : 'Font Size'              }
  , imagewidth  : { type : 'number'  , description : 'Image Width'            }
  , frameheight : { type : 'number'  , description : 'Frame Height'           }
  , fontwidth   : { type : 'number'  , description : 'Font Width'             }
  , minwidth    : { type : 'number'  , description : 'Min Function Width'     }
  , countname   : { type : 'string'  , description : 'Count Name'             }
  , colors      : { type : 'string'  , description : 'Color Theme'            }
  , bgcolor1    : { type : 'color'   , description : 'Bgcolor Gradient start' }
  , bgcolor2    : { type : 'color'   , description : 'Bgcolor Gradient stop'  }
  , timemax     : { type : 'number'  , description : 'Time Max'               }
  , factor      : { type : 'number'  , description : 'Scaling Factor'         }
  , hash        : { type : 'boolean' , description : 'Color by Function Name' }
  , titlestring : { type : 'string'  , description : 'Title'                  }
  , nametype    : { type : 'string'  , description : 'Name'                   }
}
