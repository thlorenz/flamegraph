'use strict';

module.exports = {
    fonttype    : { type : 'string'  , description : 'Font Type'                                       }
  , fontsize    : { type : 'range'   , description : 'Font Size'  , min: 6, max: 22, step: 0.1         }
  , imagewidth  : { type : 'range'  , description : 'Image Width' , min: 200, max: 2400, step: 5       }
  , frameheight : { type : 'range'  , description : 'Frame Height', min: 6, max: 40, step: 0.1         }
  , fontwidth   : { type : 'range'  , description : 'Font Width', min: 0.2, max: 1.0, step: 0.05       }
  , minwidth    : { type : 'range'  , description : 'Min Function Width', min: 0.1, max: 30, step: 0.1 }
  , countname   : { type : 'string'  , description : 'Count Name'                                      }
  , colors      : { type : 'string'  , description : 'Color Theme'                                     }
  , bgcolor1    : { type : 'color'   , description : 'Gradient start'                                  }
  , bgcolor2    : { type : 'color'   , description : 'Gradient stop'                                   }
  , timemax     : { type : 'number'  , description : 'Time Max'                                        }
  , factor      : { type : 'number'  , description : 'Scaling Factor'                                  }
  , hash        : { type : 'boolean' , description : 'Color by Function Name'                          }
  , titlestring : { type : 'string'  , description : 'Title'                                           }
  , nametype    : { type : 'string'  , description : 'Name'                                            }
  // turns on all internals inside profile: {}, passed to cpuprofilify 
  , internals: { type: 'checkbox' , description: 'Show Internals', checked: '' } 
}
