// using this as a general shared state area
import {
  timeFormat as d3TimeFormat
} from 'd3'
import KeyStore from './keystore'
export const store = ((ns)=>{
  
  // the store contains everything to do with the viz
  ns.clear = () =>  {
    ns.keyStore = null
    ns.startedAt = new Date().getTime()
    ns.simTime = 0
    ns.create()
  }
  ns.create = () => ns.keyStore = new KeyStore()

  ns.isReady = () => Boolean(ns.keyStore)

  ns.init = ({ params , dimensions, densities }) => {

    // start the sim clock running
    ns.clear()
    ns.create()
    ns.params = params
    ns.dimensions = dimensions
    ns.densities = densities
    
    // set up initial state for allocating chances
    ns.seededChances = seedChances()
    return ns
  }


  ns.simTimeTick = () =>  {
    ns.simTime += ns.params.scale.simTimeIncValue
    return ns.simTime
  }

  ns.getSimTimeDate = (simTime) => {
    return new Date(ns.params.scale.getSimTimeMs (simTime || ns.simTime))
  }

  ns.formatSimTime = (simTime) => {
    return d3TimeFormat("%H:%M")(ns.getSimTimeDate(simTime))
  }
  ns.getSimTimeClock = (simTime) => {
    simTime = simTime || ns.simTime
    const dt = ns.getSimTimeDate (simTime)
    const ob = {
      simTime,
      simTimeClock: simTime,
      date: dt
    }

    return ob
  }

  const seedChances =  () => {
    const states = ns.params.states
    return Object.keys(states).map(s=> {
      return {
        ...states[s],
        key:s
      }
    })
    .sort ((a,b)=>a.initialChance - b.initialChance)
    // cumulate chances
    .map((s,i,a) => ({
      ...s,
      cumChance: a.slice(0,i+1).reduce((p,c) => p + c.initialChance, 0) 
    }))
  }
  // just aliases for the keyStore methods for backword compatibility
  ns.getStore = (key,seed=null) => ns.keyStore.getStore(key,seed)
  ns.setStore = (key, value) => ns.keyStore.setStore(key, value)
  ns.hasStore = (key) => ns.keyStore.hasStore(key)
  ns.fStore = (key, func) => ns.getStore(key,func)
  ns.keysStore = () =>  ns.keyStore.keys
  ns.size = () =>  ns.keyStore.size
  return ns
})({})