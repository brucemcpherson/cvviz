
import {
  range as d3Range, 
  interpolateRgb  as d3InterpolateRgb,
  randomNormal as d3RandomNormal
}  from 'd3'
import {
  schemeDark2 as stateScheme
} from 'd3-scale-chromatic'
import { bbox ,randomInsideCircle} from './u'
import { store } from './store'
import SimNode from './simnode'
import faker from 'faker/locale/en_GB'

const { setStore, getStore  } = store

export const setRandomPosition = ({t, radius}) => {
  const {bb} = t
  const xy =  randomInsideCircle ({
    x: bb.x,
    y: bb.y, 
    radius: bb.radius - radius
  })
  t.x = xy.x
  t.y = xy.y

}

export const startPositions = ({type}) => getStore(type).forEach(f=>initPosition(f))

export  const initPosition =  (ob) => {
  // just used for initialpositioning

  const xy =  randomInsideCircle ({
    x: ob.bb.x,
    y: ob.bb.y, 
    radius: ob.bb.radius - ob.simNode.radius
  })

  ob.x = xy.x
  ob.y = xy.y
  return ob
}

export const seedInit = () => {

  const { densities } = store
  const seeds = [{
    type: 'area',
    size: densities.numAreas,
    memberType: 'place',
    homeType: null,
    homeSize: 0
  }, {
    type: 'place',
    size: densities.numPlaces,
    memberType: 'person',
    homeType: 'area',
    homeSize: densities.numAreas
  }, {
    type: 'person',
    size: densities.numPeople,
    memberType: null,
    homeType: 'place',
    homeSize: densities.numPlaces
  }, {
    type: 'place',
    size: densities.numPublic,
    memberType: 'person',
    homeType: 'area',
    baseIdx: densities.numPlaces,
    kind: 'public',
    homeSize: densities.numAreas
  }]

  seeds.forEach(({type, size, homeType, memberType,kind,baseIdx = 0,homeSize})=>{

    const simStore = getStore(type+'sn',[])
    const propsStore = getStore(type+'props',[])

    setStore(kind || type, d3Range(size).map((_,x) => {
      const idx = x + baseIdx
      simStore[idx] = new SimNode ({
        kind,homeType, type, memberType,idx,homeSize
      })
      propsStore[idx] = {}
      return {
        get simNode () {
          return simStore[idx]
        },
        get props () {
          return propsStore[idx]
        },
        set props (val) {
          propsStore[idx] = val
        },
        get bb () {
          return this.props.bbox
        },
        get fullName () {
          return this.simNode.type === 'person' 
          ? this.props.name + ' '  + this.simNode.homeData.props.name
          : this.props.name
        },
        _x: 0,
        _y: 0,
        // this is used to record intermediate tweening positions
        _zx: 0,
        _zy: 0,
        _progress: 0,
        _targetEnd: 0,
        get x () {
          return this._x
        },
        set x (value) {
          this._x = value
        },
        get zx () {
          return this._zx
        },
        set zx (value) {
          this._zx = value
        },
        get progress () {
          return this._progress
        },
        set progress (value) {
          this._progress = value
        },
        get targetEnd () {
          return this._targetEnd
        },
        set targetEnd (value) {
          this._targetEnd = value
        },
        get y () {
          return this._y
        },
        set y (value) {
          this._y = value
        }
      }
    }))
  })
  // now we need to scrap the public nodes, and merge them with the areas
  // but first fake the radii
  Array.prototype.push.apply(getStore('place'),getStore('public'))
  // now fix radius to save calculating each time
  fixRadius({type: 'place', memberType: 'person'})
  fixRadius({type: 'area', memberType: 'place'})

}

const fixRadius = ({type, memberType}) => {
  
  const obs = getStore(type)
  const members = getStore(memberType)
  obs.forEach(ob=> {
    const {simNode} = ob
    const family = members.filter(f=>f.simNode.homeIdx === simNode.idx)
    const n = Math.PI
    const ca = simNode.kind === 'public' 
      ? d3Range(store.densities.publicCapacity * (2*Math.random()+1))
        .reduce((p,c)=> p+Math.PI*store.dimensions.baseRadius*store.dimensions.baseRadius*n,0)  
      : family.reduce((p,c)=> p+Math.PI*c.simNode.radius*c.simNode.radius*n,0)
    simNode.radius = Math.sqrt(ca/Math.PI)

  })
  
  return obs
}
  
// create area nodes
export const seedAreas = () => {
  const { dimensions } = store
  const type = 'area'
  
  // create some random areas
  const items = getStore(type).map((t,_,a) =>{
    const {vp, idx} = t.simNode
    const {ramp} = vp
    faker.seed(Math.ceil(Math.random() * 100))
    const props = {
      name: faker.address.city(),
      color: d3InterpolateRgb(ramp.from, ramp.to)((idx+1)/a.length),
      get bbox () {
        return bbox({
          width: dimensions.width, 
          height: dimensions.height,
          x: dimensions.width/2,
          y: dimensions.height/2
        })
      }
    }
    t.props = props
    return t
  })
  setStore(type,items)
}

// create place nodes
export const seedPlaces = (type='place') => {

  // create some random places
  let prefIdx = 0
  const items = getStore(type).map((t,_,a) =>{
    const {vp, idx, radius,homeIdx,kind} = t.simNode
    const {ramp, rampPublic} = vp
    
    faker.seed(Math.ceil(Math.random() * 100))
    const name = kind === 'public' 
      ? vp.preferredPublicNames[prefIdx++] || faker.company.companyName()
      : faker.name.lastName()

    const color = kind === 'public' 
      ? d3InterpolateRgb(rampPublic.from, rampPublic.to)((homeIdx+1)/store.densities.numAreas)
      : d3InterpolateRgb(ramp.from, ramp.to)((homeIdx+1)/store.densities.numAreas)

    const props = {
      name,
      color,
      get bbox () {
        const parentData = t.simNode.destinationData 
        return  bbox ({
          width: parentData.simNode.radius*2, 
          height: parentData.simNode.radius*2,
          x: parentData.x,
          y: parentData.y
        })
      }
    }
    t.props = props
    return t
  })

  setStore (type, items)
}
export const randNormal = ({size,mean,sigma}) =>  Array.from({length:size}, d3RandomNormal(mean,sigma || mean/3))
export const seedInitialStates = () => {
  getStore('person').forEach(({props,simNode})=>{
    const r = Math.random()
    const state = store.seededChances.find(f=>r<=f.cumChance)
    props.state =  state.key
  })
}
export const seedPeople = () => {
  const { states } = store.params
  const type = 'person'
  const ds = getStore(type)
  // get a normal distribution to be used to emulat superspreaders and super easily infected
  const susceptibility = randNormal ({size: ds.length, mean: 0.6})
  const infectability = randNormal ({size: ds.length, mean: 0.8})
  const mortality = randNormal ({size: ds.length, mean: store.params.probabilities.mortality})
  const tillDeath = randNormal ({size: ds.length, mean: store.params.probabilities.periods.tillDeath})
  const tillRecovered = randNormal ({size: ds.length, mean: store.params.probabilities.periods.tillRecovered})
  const tillVisitEnd = randNormal ({size: ds.length, mean: store.params.probabilities.periods.tillVisitEnd})
  const goingOut = randNormal ({size: ds.length, mean: store.params.probabilities.goingOut})
  const compliance = randNormal ({size: ds.length, mean: store.params.probabilities.compliance})
  const hotspots = randNormal ({size: ds.length, mean: store.params.probabilities.periods.hotspot})
  const items = getStore(type).map((t,i) =>{
    faker.seed(Math.ceil(Math.random() * 100))
    const props = {
      get bbox () {
        const parentData = t.simNode.destinationData 
        return  bbox ({
          width: parentData.simNode.radius*2, 
          height: parentData.simNode.radius*2,
          x: parentData.x,
          y: parentData.y
        })
      },
      name: faker.name.firstName(),
      get color () {
        return stateScheme[states[this.state.value].color]
      },
      _log: [],
      susceptibility: susceptibility[i],
      infectability: infectability[i],
      mortality: mortality[i],
      tillDeath: tillDeath[i],
      tillRecovered: tillRecovered[i],
      tillVisitEnd: tillVisitEnd[i],
      compliance: compliance[i],
      goingOut: goingOut[i],
      hotspot: hotspots[i],
      _state: {
        history:[]
      },
      get log () {
        return this._log
      },
      set log (value) {
        const sob = {
          value,
          startedAt: store.simTime
        }
        this._log.push(sob)
      },
      get state() {
        const h = this.history
        return  h && h[h.length-1]
      },
      get stateSince () {
        const state = this.state
        return state && (store.simTime - state.startedAt)
      },
      get history () {
        return this._state && this._state.history
      },
      set state (value) {
        const sob = {
          value,
          startedAt: store.simTime
        }
        this._state.history.push(sob)
      }
    }
    t.props = props
    return t
  })
  setStore (type, items)
}


