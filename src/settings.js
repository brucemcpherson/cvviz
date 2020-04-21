const vizWidth = window.innerWidth
const vizHeight = window.innerHeight
const toolUnit = 206
const toolMargin = 2
const toolWidth = toolUnit - toolMargin*2
const smallTool = toolUnit/2
const toolLeft = vizWidth - toolUnit
const mTool =  {left:45,top:5,bottom:18,right:20}


// initial userStates
export const userStates = {
  _rate: 0.5,
  _capacity: 0.5,
  _compliance: 0.5,
  _numPeople: 0.5,
  _showLogMoves: false,
  _showLogEvents: true,
  get compliance () {
    return this._compliance
  },
  set compliance (value) {
    this._compliance = value
  },  
  get capacity () {
    return this._capacity
  },
  set capacity (value) {
    this._capacity = value
  },  
  set rate (value) {
    this._rate = value
  },  
  get rate () {
    return this._rate
  },
  set rate (value) {
    this._rate = value
  },  
  get numPeople () {
    return this._numPeople
  },
  set numPeople (value) {
    this._numPeople = value
  },
  get effectiveCapacity () {
    return this.capacity * 1
  },
  get showLogEvents () {
    return this._showLogEvents
  },
  set showLogEvents (val ) {
    this._showLogEvents = val
  },  
  get showLogMoves () {
    return this._showLogMoves
  },
  set showLogMoves (val ) {
    this._showLogMoves = val
  }

}
const margin = {
  top: 0, 
  right:0, 
  bottom: 0, 
  left: 0
}
const tableMargin = {
  top:4,
  left:toolLeft,
  right:0, 
  bottom: 0
}
const table = {
  margin: tableMargin,
  width: toolWidth,
  height: smallTool
}
const spreaderMargin = {
  top: tableMargin.top + table.height,
  left: toolLeft, 
  right:0, 
  bottom: 0
}
const spreader = {
  margin: spreaderMargin,
  width: toolWidth,
  height: smallTool
}
const lineMargin = {
  top: spreaderMargin.top + spreader.height, 
  right:0 , 
  bottom: 0, 
  left: toolLeft
}
const lineChart = {
  margin: lineMargin,
  width: toolUnit,
  height: smallTool
}
const statsMargin = {
  top: lineMargin.top + lineChart.height, 
  right:0 , 
  bottom: 0, 
  left: toolLeft
}
const statsChart = {
  margin: statsMargin,
  width: toolWidth,
  height: toolUnit
}
const eventMargin = {
  top:0,
  right: 0, 
  left: 0, 
  bottom: 0
}
const eventLog = {
  margin: eventMargin,
  width: toolWidth,
  height: vizHeight - toolUnit - toolMargin
}
const widgetMargin = {
  top: 8 + eventLog.height + eventMargin.top + toolMargin*4, 
  right:toolWidth/2 - 20, 
  bottom: 0, 
  left: 12
}
const widget = {
  margin: widgetMargin,
  width: toolWidth,
  height: toolWidth,
  padding: 2,
  itemHeight: 24
}

const clockMargin = {
  top:vizHeight -toolUnit + 10,
  right:0,
  left: vizWidth -toolUnit + 8, 
  bottom: 0
}
const clock  = {
  margin: clockMargin,
  width: toolWidth,
  height: toolWidth
}


export const densities = {
  familyDensity: 2.7,
  publicDensity: 47,
  publicCapacity: 7,
  maxPeople: 1000,
  get numPeople () {
    return Math.max(5,userStates.numPeople * this.maxPeople)
  },
  get numFamilies () {
    return Math.ceil(this.numPeople/ this.familyDensity)
  },
  get numPlaces () {
    return Math.ceil(this.numPeople/ this.familyDensity)
  },
  get numPublic () {
    return Math.ceil(this.numPeople/ this.publicDensity)
  },
  numAreas: 4
}
// just spelling this out
const golden =  1.618
const worldArea = Math.PI*Math.pow(vizHeight/2,2)
const worldPadding = Math.PI*Math.PI*golden*golden

export const dimensions = {

  margin,
  vizWidth,
  vizHeight,
  width:vizWidth-margin.right-margin.left,
  height:vizHeight-margin.top-margin.bottom,
  get baseRadius () {
    return Math.sqrt(worldArea/worldPadding/densities.numPeople/Math.PI)
  },
  maxSpeed: 5,
  padding: 1,
  eventLog,
  statsChart,
  clock,
  table,
  spreader,
  widget,
  lineChart,
  mTool
};


export const defaultParams = {
  logs: {
    maxLog: 200
  },
  scale: {
    // how ofte to up date charts
    updateRate: 3000,
    // time between each movement tick
    // needs to adapt based on the timerate
    get simMoveRateMs () {
      // every hour minutes would be
      // 1/24/simtimerate
      // return this.getSimTimeMs(1/24/this.simTimeRate)
      // but its probably better just to keep it consistent
      return 2000
    },
    // since the rate is user changeable, we need to run a separate time system indepependent of the machine time
    // how often the clock is updated
    simTimeTickRate: 300,

    // how many ms 1 unit is worth (so here, 1 smunit = 1 day)
    // simdays are used in expressing times throughout
    simTimeUnit: 60*60*1000*24,
    // how fast the sim is supposed to run at
    // user changeable
    get simTimeRate () {
      return  userStates.rate * 18000
    },
    // how to increment (every tickrate)
    // update the clock compensating for how ofetn the update happens and how fast the sim is running
    get simTimeIncValue () {
      return this.simTimeTickRate / this.simTimeUnit * this.simTimeRate
    },
    // how many simUnits in a day - this will be 1 if a simunit is a day
    get simUnitsPerSimDay () {
      return 60*60*1000*24/ this.simTimeUnit
    },
    // convert ms to simUnit
    getSimTimeValue (ms) {
      return ms/this.simTimeUnit
    },
    // convert unit to ms
    getSimTimeMs (st) {
      return st * this.simTimeUnit
    },
    // assume world is nkm wide
    // note that journeys in he sim are articifically long
    // otherwise accelerated time makes it look like they never happen
    worldKm: 6,
    kph: 4,
    // how many simunits to travel across the whole thing
    get walkWorld () {
      return this.worldKm/this.kph * (1+Math.random())
    },
    get walkWorldMs () {
      return this.getSimTimeMs(this.walkWorld)
    }, 
    // how long to move across 
    getMoveTime ({width, distance}) {
      return distance/width * this.walkWorldMs / this.simTimeRate
    }
  },
  states: {
    dead: {
      color:7,
      initialChance: 0.00
    },
    infected: {
      color: 3,
      initialChance: 0.0
    },

    carrier: {
      color: 1,
      initialChance: 0.02
    },
    recovered: {
      color: 2,
      initialChance: 0.00,
    },
    healthy: {
      color: 0,
      initialChance: 1.1
    },
    immune: {
      color: 5,
      initialChance: 0.02
    }
  },
  probabilities:{
    work: (...probs) => probs.reduce((p,c)=>c*p,1),
    // chance that you're going to a public place (rather than a house) when going out
    get goingPublic () {
      return 0.5 * this.compliance + 0.5
    },
    // chance of going out
    get goingOut () {
      return  1.5 * (1-this.compliance) 
    },
    // chance of complying with rules / cant be full compliance as nothing would happen , but might need smoothing
    get compliance () {
      return userStates.compliance * 0.9
    },
    // social distance is used for calculating collisions
    socialDistance: 0.5,
    // the infectiousness overall
    infectiousness: 0.5,
    // if score is over this the encounter causes an infection
    infectedLow: 0.27,
    // applies when someoine is sick nad affects their propesnity to go out
    // used in conjunction with compliance
    selfIsolating: 0.5,
    // if score over this, he's dead
    diedLow: 0.19,
    recoveredLow: 0.25,
    // how deadly the disease is
    mortality: 0.2,
    // days after infection for death
    periods: {
      tillDeath: 7,
      tillRecovered: 18,
      tillVisitEnd: 0.2,
      get hotspot () {
        return this.tillRecovered * 0.25
      }
    },
    gotRecovered (a, simTime) {
      const {props} = a
      const state = props.state
      // infected for long enough
      // the deadperiod has been used to create a standar dist around each person
      if(state.value !== 'infected' || state.startedAt + props.tillRecovered > simTime) return {
        recovered: false
      }
      // lets assume recovarability is the opposite of mortality
      const p = this.work(1-props.mortality,Math.random())
      return {
        source: a,
        recovered: p > this.recoveredLow,
        p
      } 

    },
    manageability (usage) {
      return Math.pow(1+userStates.effectiveCapacity, 1-usage) - 1
    },
    gotDead (a, simTime, usage) {
      const {props} = a
      const state = props.state
      // infected for long enough
      // the deadperiod has been used to create a standar dist around each person
      if(state.value !== 'infected' || state.startedAt + props.tillDeath > simTime) return {
        died: false
      }
    
      // this will give a smotthing to chance of dying based on capacity
      const p = this.work(props.mortality,Math.random()) * (1-this.manageability(usage))

      return {
        source: a,
        died: p > this.diedLow,
        p
      } 

    },
    gotInfected (a,b) {
      // xor if either are infected
      const af = a.props.state.value === 'infected' || a.props.state.value === 'carrier'
      const bf = b.props.state.value === 'infected' || b.props.state.value === 'carrier'

      if (!af !== !bf) {

        const source = (af && a) || b
        const target = (!af && a ) || b
        const {simNode: ss, props: sp } = source
        const {simNode: ts, props: tp } = target
        const {state} = tp

        // you can only infect if both are moving or both as in the same house, and the taget is currently healthy
        const infectable = ss.currentIdx === ts.currentIdx && state.value === 'healthy'
        const result = {
          infected: false,
          source,
          target
        }
        if (!infectable) return result

        // the probability of being infected is a factor of both the target and the source
        const q = this.work(
          source.props.infectability + target.props.susceptibility,
          this.infectiousness,
          Math.random()
        )
        // modified by how hot the source is now (carriers have constant hotness)
        const hotness = sp.state.value === 'infected' 
          ? 1/Math.pow(1.2, 0.1 + Math.abs(sp.hotspot-sp.stateSince))
          : 1
        const p = q * hotness
        
        return {
          ...result,
          infected:  p > this.infectedLow,
          p
        } 
      } else {
        return {
          infected: false
        }
      }
    }
  },
  area: {
    velocityDecay: 0.4,
    alphaDecay: 0.0228,
    get strengthX () {
      return 1 - dimensions.width/(dimensions.width + dimensions.height)
    },
    get strengthY () {
      return 1 - dimensions.height/(dimensions.width + dimensions.height)
    },
    ramp: {
      from: "#fff8e1",
      to: "#FFECB3"
    },
    charge: -1,
    get radius () {
      dimensions.baseRadius
    },
    collisionPadding (d) {
      return d.simNode.radius  + d.simNode.radius * 0.08
    },
    collisionIterations: 3,
    collisionTween: 0
  },
  place: {
    velocityDecay: 0.4,
    alphaDecay: 0.0228,
    get strengthX () {
      return 0.1
    },
    get strengthY () {
      return 0.1
    },
    ramp: {
      from: "#e8eaf6",
      to: "#c5cae9"
    },
    rampPublic: {
      from: '#b2dfdb',//"#f9fbe7",
      to: '#80cbc4'//"#f0f4c3"
    },
    preferredPublicNames: ['Cheltenham','Tesco','Hyde park','Asda','Green park','The beach','Wetherspoons'],
    get charge() {
      return -1
    },
    radius: dimensions.baseRadius,
    collisionPadding (d) {
      return d.simNode.radius  + d.simNode.radius * (d.simNode.seed + 0.2)
    },
    collisionIterations: 2,
    collisionTween: 0
  },
  person: {
    velocityDecay: 0.4,
    alphaDecay: 0.0228,
    get strengthX () {
      return 0.08
    },
    // this is what gravitates a node home
    get strengthY () {
      return 0.08
    },
    charge: -0.2,
    // the person radius is the base unit as it has no children
    radius:dimensions.baseRadius,
    // this defines when a collision happens
    collisionPadding (d) {
      return d.simNode.radius  + d.simNode.radius *  0.1
    },
    // 1 is fine, otherwise it'd be too busy
    collisionIterations: 1,
    // 0 means no checking for collision/infection transitions
    // 1 means check on every tween 
    // best for this to be pretty low, otherwise its going to be heavy
    // this is affected by compliance as it simulates sticking to social distancing
    get collisionTween () {
      return Math.max(0.2, (1-userStates.compliance )) * 1
    }
  }
}
    

