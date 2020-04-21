
import { vizInit } from './viz'
import { store } from './store'
import { densities, defaultParams, dimensions } from './settings'
export const init = () => {
  // do anything here that should be done only once
  // make a new store
  store.init ({
    dimensions,
    densities,
    params:defaultParams 
  })

  // start the viz
  vizInit()
}



