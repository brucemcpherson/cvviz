

import {
  mean as d3Mean,
  deviation as d3Deviation,
  max as d3Max,
  stackOffsetNone as d3StackOffsetNone,
  scaleOrdinal as d3ScaleOrdinal,
  scaleBand as d3ScaleBand,
  interval as d3Interval,
  selectAll  as d3SelectAll,
  select  as d3Select,
  forceSimulation as d3ForceSimulation,
  forceX as d3ForceX,
  forceY as d3ForceY,
  forceManyBody as d3ForceManyBody,
  forceCollide as d3ForceCollide,
  interpolate as d3Interpolate,
  easeSinInOut as d3EaseSinInOut,
  scaleLinear as d3ScaleLinear,
  axisBottom as d3AxisBottom,
  axisLeft as d3AxisLeft,
  line as d3Line,
  stack as d3Stack,
  area as d3Area,
  event as d3Event,
  format as d3Format,
  timerFlush as d3TimerFlush,
  extent as d3Extent
}  from 'd3'
import {
  schemePaired as barScheme,
  schemePaired as spreaderScheme,
  schemeDark2 as stateScheme,
  schemeCategory10 as vitalScheme

} from 'd3-scale-chromatic'


import {store} from './store'
import {waitABit,expand,randomInsideCircle} from './u'
import {d3Clock} from './clock'
import * as d3slider from 'd3-simple-slider'
const {getStore, setStore, hasStore, formatSimTime, fStore} = store
import { seedAreas, seedPlaces, seedPeople, seedInit, startPositions, seedInitialStates } from './nodes'
import { dimensions, userStates } from './settings'

// calculate the real r0 for everybody
// we can use the history for that
const getR0 = () => {
  // everybody who is currently infected
  const all = getEverybody().filter(f=>f.props.state.value === 'infected')

  // search through their logs and see owhow many others they infected
  const v = all.reduce((p,c,i)=>{

    const z =  c.props.log.filter(g=>g.value.eventType === 'infect' && g.value.source === c.simNode.idx).length
    return p +z 
  },0)
  return all.length ? v/all.length : 0
}

const getCaseLength = () => getStore('person')
    .filter(f=>f.props.state.value !== 'healthy' && f.props.state.value !== 'immune').length

const getCases = () => getCaseLength() / getStore('person').length
const getInfectedCases = () => getStore('person')
.filter(f=>f.props.state.value === 'infected').length/ getStore('person').length

const getManageability = () => store.params.probabilities.manageability(getInfectedCases())
const getDeathRate = () => {
  const all = getStore('person')
  const numCases = all.filter(f=>f.props.state.value === 'infected' || f.props.state.value === 'recovered').length
  const dead = all.filter(f=>f.props.state.value === 'dead').length
  return dead / (numCases + dead)
}
// this returns the nearest within colliding distance and is collidable
// this is who is provoking the collision
// simulation.find is pointless as it return the same node and only returns 1 result
// so we need to look through the nodes
// get everyone in the same house or travelling but not the same node
const findNearest = (d,pd) => {
  let all = []
  let collider = null
  const {simNode:sd} = d
  getSelection({type:'person'})
  .filter(f=>f.simNode.currentIdx === sd.currentIdx)
  .each(function(f) {
    const t = d3Select(this)
    const {simNode:sf} = f

    if (sf.idx === sd.idx) {
      collider = t
    } else {
      const cx = sf.isMoving ? f.zx : f.x //gat (t, 'cx') 
      const cy = sf.isMoving ? f.zy : f.y //gat (t, 'cy') 
      const distance = Math.hypot(d.x-cx,d.y-cy)
      if(distance <= pd*2) {
        all.push({
          distance,
          t
        })
      }
    }
  })
  // just interested in the nearest one
  return  {
    collider,
    nearest: all.sort((a,b) => a.distance - b.distance)[0]
  }
}
const duration = (d) => {
  // if moving, then we need a transition, otherwise we just go straight there
  const { params, dimensions } = store
  const {simNode} = d
  if (!simNode.homeType || !simNode.isMoving) return 0

  // we're either going home, or visiting somewhere
  const distance = Math.hypot(d.x-d.tcx,d.y-d.tcy)
  // duration is based on the difference between where left and where we're going
  const dur = params.scale.getMoveTime ({width: dimensions.width, distance})

  return dur
}

const tickMove  = (g) => {
  // only move things around with the dim if its not transitioning
  // go back to regular size if we've been infected for more than half a day

  if(g){
    g.filter(d=>d.simNode && !d.simNode.isMoving).each(function(d){
      const self = d3Select(this)
      self.attr("cx", d.x).attr("cy", d.y)
    })
  }
   
}
const sim  = ({type,g,data}) => {
  const vp = store.params[type]
  const nodes = data || g.data()
 
  return new Promise ((resolve, reject) => {

    const simulation = d3ForceSimulation()
   
    // assign the viz to be simmed
    simulation.nodes(nodes)

    .on('tick', function() {
      tickMove(g)
    })

    .on ('end', resolve(simulation))

    // this forces to center of parent
    .force("forceX", d3ForceX().strength(vp.strengthX).x(d=>{
      return d.bb.x
    }))
    .force("forceY", d3ForceY().strength(vp.strengthY).y(d=>{
      return d.bb.y
    }))


    .force('charge', d3ForceManyBody().strength(vp.charge/2)) 
    .force('collide', d3ForceCollide(d=> {

      // find the nearest nodes within collision padding
      
      const pd = vp.collisionPadding(d)
      
      // we only do a sample, as it wuld be too heavy to check them all
      const {collisionTween} = vp
      const check = collisionTween && collisionTween  >= Math.random() 

      if (check) {
        const {collider, nearest} = findNearest(d, pd)
        if(!nearest) {
          // this can happen as we're ignoring collissions between those not in the same current state
        } else {
          // now we can go for an infection
         
          const inf = infect(collider,nearest.t)
          if (inf.infected) {
            inf.ot
              .style("fill",inf.target.props.color)
              .attr("r", expand(inf.target.simNode.radius))
              .transition('postinfection')
              .attr("r", inf.target.simNode.radius)
              .duration(5000)
          }

        }
      }

      
      return pd  
     }).iterations(vp.collisionIterations))
     
     .velocityDecay(vp.velocityDecay)
     .alphaDecay(vp.alphaDecay)

    
    store.setStore('sim_'+type, simulation)
  }) 
}


const gat = (sel,att) => parseFloat(sel.attr(att)) 

// record progress of sim
const zpos = function (w) {

  return function (t) {
    const self = d3Select(this)
    // have to redo the interpolator each time in case we were diverted somewhere else
    const ix = d3Interpolate(gat(self,'cx'), w.tcx)
    const iy = d3Interpolate(gat(self,'cy'), w.tcy)
    const d = self.datum()
    // where we'll be going normally
    // these are the intermediate transtion vaues which may be required elsewhere
    d.zx = ix(t)
    d.zy = iy(t)
    d.progress = t
    // but if anybody is close by, lets try to avoid them occassionally
    // TODO - this works but it makes the viz look shaky - 
    // a transition would be better but it screws up the master
    // a tweak for another day
    /*
    const {collisionTween} = d.simNode.vp
    const check = collisionTween && collisionTween/2  >= Math.random()
    if (check) {
      const {nearest} = findNearest(d)
      if(nearest) {
        const pad = d.simNode.vp.collisionPadding(d)
        d.zx = d.zx + (d.simNode.idx % 2 ? -1 : 1) * Math.random() * pad 
        d.xy = d.zy + (d.simNode.idx % 2 ? 1 : -1) * Math.random() * pad 
      }
    }
    */
    self.attr('cy',d.zy).attr('cx',d.zx)
    return d
  }
}
export const movePeople = () => {

  const type = 'person'
  const simName = 'sim_'+ type
  const pb = store.params.probabilities

  if (store.hasStore(simName)) 
    store.getStore(simName).stop()

  // get capacity usage
  const usage = getInfectedCases()

  // get everyone
  const sel = getSelection({type:'person'})

  // deal with anybody changing state
  
  sel.each(function(person) {
    const {simNode,props} = person
    const x = d3Select(this)

    // deal with anyone dying or recovering this round
    const died = pb.gotDead(person,store.simTime,usage)
    const log = {eventType:'die', source:person, target:null, placeFrom: null, placeTo:null}
    getStore('deadp', ()=>[]).push(died)
    if (died.died) {
      props.state = 'dead'
      addLog (log)
      // this explodes the circle, then slowy returns to original size
      x.attr("r", expand(simNode.radius))
      .transition('dying')
        .duration(5000)
        .attr("r", simNode.radius)
        .style('fill', props.color)
    } else {
      const recovered = pb.gotRecovered(person,store.simTime)
      if(recovered.recovered) {
        props.state = 'recovered'
        addLog ({...log,eventType:'recover'})
        x.attr("r", expand(simNode.radius))
        .transition('recovering')
          .duration(5000)
          .attr("r", simNode.radius)
          .style('fill', props.color)
      }
    }
  })

  // pick some people to go out
  sel.filter(d=>!d.simNode.isMoving && d.props.state.value !== 'dead')
  .each(function(person) {
    const {simNode,props} = person
    // go home or visit somewhere
    
    if (simNode.isVisiting && (store.simTime < simNode.visitStartedAt + props.tillVisitEnd)) {
      // visit isnt over yet
      return null
    }
    // we'll need this later
    const x = d3Select(this)
    // going out is based on the individual propenstity to going out against how often its checked perday
    const gout = props.goingOut * (1-props.compliance) * 
      (props.state.value ==='infected' ? pb.selfIsolating : 1)
    const cms = store.params.scale.simMoveRateMs
    const sdayms = store.params.scale.getSimTimeMs(store.params.scale.simUnitsPerSimDay)
    const gp = gout/(sdayms/cms) * store.params.scale.simTimeRate 
    
    //  randomly move someone    
    if (Math.random() <= gp) {

      // either go home or go to some random place
      const place = simNode.isVisiting  ? store.getStore('place')[simNode.homeIdx] : randomPlace()
      
      // but dont go to the same place we currently are
      if(place.simNode.idx !== simNode.currentIdx) {
        // finally launch a transition to that new place
        const log = {eventType:'home', source:person, target:null, placeFrom: null, placeTo: place}
        if (simNode.isVisiting) {
          // visit is over, provoke going home
          simNode.visitIdx = -1
          addLog (log)
        } else {
          // time to leave for somewhere
          simNode.visitIdx = place.simNode.idx
          addLog ({...log, eventType:'visit'})
        }
        // we're no longer at rest
        simNode.currentIdx = -1

        // setup where we're going,and how long its expected to take
        const xy =  randomInsideCircle ({
          x: place.x,
          y: place.y, 
          radius: place.simNode.radius - person.simNode.radius
        })
        person.tcx = xy.x
        person.tcy = xy.y
        
      
        const dur = duration(person)
        const delay = dur/Math.PI * Math.random()
        person.targetEnd =  dur  + delay + new Date().getTime()


          x.transition()
            .attr('cx',person.tcx)
            .attr('cy',person.tcy)

          .duration(dur)
          .ease(d3EaseSinInOut)
          .delay(delay)

          // need to do tweening to record intermediate positions for collistion detecting
          .tween('collision', zpos)

          // detect the end of journey
          .on('end', function () {
            const n = d3Select(this)
            const d = n.datum()
            n.attr("cx", d.tcx)
            n.attr("cy", d.tcy)
    
            d.x = d.tcx
            d.y = d.tcy
            d.simNode.currentIdx = d.simNode.visitIdx === -1 ? d.simNode.homeIdx : d.simNode.visitIdx
            const eventType = d.simNode.isAtHome ? 'home-ends' : 'visit-ends'
            addLog ({...log,eventType})
            n.datum(d)

          })
      }
    } 

  })
  const data = sel.data()
  store
  .getStore(simName)
  .nodes(data)
  .restart()
  .alpha(0.1)
  /*
    // for experimenting with probs
    const dead = getStore('deadp',()=>[]).filter(f=>f.died).map(f=>f.p)
    const alive = getStore('deadp',()=>[]).filter(f=>!f.died).map(f=>f.p).filter(f=>f)
    const all = getStore('deadp',()=>[]).map(f=>f.p).filter(f=>f)

    if(dead.length)console.log('deadms', d3Mean(dead),d3Deviation(dead))
    if(alive.length)console.log('alivems', d3Mean(alive),d3Deviation(alive))
    if(all.length)console.log('allms', d3Mean(all),d3Deviation(all))
  */
}
export const startMoving = () => {

  // movePeople()
  const rate = store.params.scale.simMoveRateMs
  store.setStore('interval_move', d3Interval(movePeople,  rate))
}

export const randomPlace = () => {
  // the places should be sorted by radius, placing the highest at the end
  const places = store.fStore('place_sort',
    ()=> store.getStore('place')
      .filter(f=>f.simNode.kind!=='public')
      .slice()
      .sort((a,b) => a.simNode.radius - b.simNode.radius)
  )
  const publics = store.fStore('publics_sort',
    ()=> store.getStore('place')
      .filter(f=>f.simNode.kind==='public')
      .slice()
      .sort((a,b) => a.simNode.radius - b.simNode.radius)
  )
  // pick whether we're going public or private
  const targets =  Math.random() < store.params.probabilities.goingPublic ? publics : places
  // the lower this number, the more it biases the choice to the bigger places
  // 0.5 biases to the top, 2 biases to the bottom, 1 is even
  const bias = 0.75
  const target = Math.floor(targets.length  * Math.pow(Math.random(), bias))

  return targets[target]
}
export const startCollecting = () => {
  const pn =  'stats_person'
  const p = setStore(pn,[])

  // do these reports seperately to spread the load out
  setStore('interval_viz', d3Interval(()=>{
    drawBar()
    drawSpreader()
  },store.params.scale.updateRate))

  setStore('interval_stats', d3Interval(()=>{
    p.push(getCurrentStats())
    updateStatsChart()
    updateLineChart()
  },store.params.scale.updateRate,store.params.scale.updateRate/2))
}

// this is just for debuggin in case we end up with a dodgy arg to an attr.
const cn = v => {
  if (typeof v !== 'number') {
    debugger
  }
  return v
}

// tracks values like r0 over time
const updateLineChart = () => {
  // normalize for d3 area data
  const { dimensions} = store
  const {lineChart} =  dimensions
  const {width:w, height:h} = lineChart
  // some margin for scales
  const m = store.dimensions.mTool
  const width = w - m.left - m.right
  const height = h - m.top - m.bottom
  const pn =  'line_person'
  const gn = pn+'_r0_chart'
  const dn = gn+ '_r0_data'

  const svg = getStore('svg_r0')
  // overall chart container
  const sg = getStore(gn, ()=> 
    svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
  )
  const format = d3Format('.2')

  // first time in, create a data accumulator
  const data = getStore(dn,()=>({
    title: 'Vitals',
    series:[{
      name:'r0',
      values:[0]
    }, {
      name: 'death rate',
      values:[0]
    }, {
      name: 'total cases',
      values:[0]
    }, {
      name: 'active cases',
      values:[0]
    }, {
      name: 'manageability',
      values:[0]
    }],
    dates: [store.simTime]
  }))

  const keys = data.series.map(f=>f.name)
  const color = d3ScaleOrdinal()
    .domain(keys)
    .range(vitalScheme);

  // add the the various current vitals for this cycle
  const st = store.simTime
  data.dates.push(st)
  data.series[0].values.push(getR0())
  data.series[1].values.push(getDeathRate())
  data.series[2].values.push(getCases())
  data.series[3].values.push(getInfectedCases())
  data.series[4].values.push(getManageability())

  // calculate x pos
  const x = d3ScaleLinear()
    .domain(d3Extent(data.dates))
    .range([5, width])

  // calculate y pos
  const y = d3ScaleLinear()
    .domain([0, 1.5]).nice()
    .range([height, m.top])

  // xaxis shows simtimes
  const xAxis = g => g
    .attr("transform", `translate(5,${height})`)
    .attr("class", "axis bar axis--x")
    .call(d3AxisBottom(x).ticks(4))

  // y axis values
  const yAxis = g => g
  .attr("transform", `translate(0,0)`)
  .style("fill", "black")
  .attr("class", "axis bar axis--y")
  .call(d3AxisLeft(y))


  // line generator
  const line = d3Line()
  .defined(d => !isNaN(d))
  .x((d, i) => x(data.dates[i]))
  .y(d => y(d))

  getStore(gn+'_xaxis',()=>sg.append("g"))
    .call(xAxis)
  
  getStore(gn+'_yaxis',()=>sg.append("g"))
    .call(yAxis)
  
  addTitle ({sg,gn,title:data.title})

  // finally the path
  getStore(gn+'_path',()=>sg.append("g").attr('transform','translate(5,0)'))
    .selectAll(".path")
      .data(data.series)
    .join("path")
      .attr("class","path")
      .attr("fill", "none")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .style("mix-blend-mode", "multiply")
      .attr('stroke',(d,i)=>vitalScheme[i])
      .attr("d", d => line(d.values))

  // Add one dot in the legend for each name.
  getStore(gn+'_legenddots',()=>sg.append("g"))
    .selectAll(".legenddots")
      .data(keys)
    .join("rect")
      .attr("class","legenddots")
      .attr("x", (d,i) =>  12)
      .attr("y", (d,i) =>  i*8)
      .attr("width", 5)
      .attr("height", 5)
      .style("fill", d=>color(d))

  getStore(gn+'_legendlabels',()=>sg.append("g"))
    .selectAll(".legendlabels")
      .data(data.series, d=> d.name)
    .join("text")
      .attr("class","legendlabels")
      .attr("x", (d,i) =>  19 )
      .attr("y", (d,i) =>  i*8 + 3) 
      .text(d => `${d.name} (${format(d.values.slice(-1)[0])})` )
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")


}

// draw bar chart of who is out and who is in
const drawBar = () => {

  // make stats for state vs position
  const headings = ['state','total','home','visit','moving']
  const peopleData = getEverybody()
  const pm = new Map(Object.keys(getStatsOb()).map(k=>([k,headings.reduce((p,c)=>{
    p[c] =  c==='state' ? k : 0
    return p
  },{})])))
  const values = Array.from(peopleData.reduce((p,c)=>{
    const e = p.get(c.props.state.value)
    e.total++
    if(c.simNode.isAtHome) e.home++
    if(c.simNode.isVisiting) e.visit++
    if(c.simNode.isMoving) e.moving++
    e.state = c.props.state.value
    return p
  }, pm).values())

  // convert to %ages
  const max = peopleData.length
  const data = values.map(d=>({
    state: d.state,
    home: d.home/max *100,
    visit: d.visit/max * 100,
    moving: d.moving/max *100
  }))

  stackedBar({
    dims: store.dimensions.table,
    m: store.dimensions.mTool,
    name: 'stats_person_bar',
    data,
    keys: ['home','visit','moving'],
    baseSvg: 'svg_bar',
    colorScheme: barScheme,
    yDomain: ()=> ['hacktoavoidmissinglabel'].concat(Object.keys(getStatsOb())),
    xDomain: ()=> [0,100],
    yGet: (d)=>d.data.state,
    tickFormat: (data, key) => {
      const ob = data.find(f=>f.state===key)
      return ob ? `${key} (${Math.round(ob.home+ob.visit+ob.moving)})` : ''
    },
    title: "State %"
  })
}

// draw bar char of superspreaders
const drawSpreader = () => {

  // get all the people data
  const peopleData = getEverybody()
    
  // now we're looking for the top 10 spreaders
  const data = peopleData.map(f=> {
    const infected = f.props.log.filter(g=>g.value.eventType === 'infect' && g.value.source === f.simNode.idx)
    const family = infected.filter(g=>g.value.family)
    return infected.length ? {
      idx: f.simNode.idx,
      name:f.fullName,
      infected: infected.length,
      family: family.length,
      others: infected.length - family.length
    } : null
  })
  .filter(f=>f)
  .sort((a,b)=>{
    const c = a.infected-b.infected 
    return c ? c : (a.name === b.name ? 0 : (b.name > a.name ? 1 : -1) )
  })
  .slice(-10)

  stackedBar({
    dims: store.dimensions.spreader,
    m: store.dimensions.mTool,
    name: 'stats_spreader_bar',
    data,
    keys: ['others','family'],
    baseSvg: 'svg_spreader',
    colorScheme: spreaderScheme,
    yDomain: (data)=> ['hacktoavoidmissinglabel'].concat(data.map(f=>f.name)),
    yGet: (d)=> d.data.name,
    xDomain: (data)=>[0,Math.max(10,d3Max(data.map(f=>f.infected)))],
    tickFormat: (data, key) => {
      const ob = data.find(f=>f.name===key)
      return ob ? `${key} (${(data.find(f=>f.name===key).infected)})` : ''
    },
    title:"Superspreaders"
  })
}

const addTitle = ({sg, gn,title}) => 
  getStore(gn+'_title',()=>sg.append("g")
  .append("text")
  .attr("y",-7)
  .attr("dy", ".71em")
  .style("text-anchor", "end")
  .style("font-weight","bold")
  .text(title))


// resuable stacked bar chart
const stackedBar = ({dims,m, name,data, keys, baseSvg, title, colorScheme, ticks = 4, yDomain, xDomain, tickFormat, yGet}) => {
  // normalize for d3 area data
  const {width:w, height:h} = dims
  // some margin for scales
  const width = w - m.left - m.right
  const height = h - m.top - m.bottom
  const pn =  name
  const gn = pn+'_chart'
 
  const stack = d3Stack()
    .keys(keys)
    .offset(d3StackOffsetNone);
  const color = d3ScaleOrdinal(colorScheme)
  const xScale = d3ScaleLinear().rangeRound([0, width])
  const yScale = d3ScaleBand().rangeRound([height, 0]).padding(0.1)
  const xAxis = d3AxisBottom(xScale).ticks(ticks)
  const yAxis =  d3AxisLeft(yScale).tickFormat((a) => tickFormat ? tickFormat(data,a) : a)

  const layers = stack(data);
  yScale.domain(yDomain(data))
  xScale.domain(xDomain(data)).nice()

  // base position
  const svg = getStore(baseSvg)

  // this only happens once
  const sg = getStore(gn, () =>  
   svg.append('g')
   .attr('transform', `translate(${m.left},${m.top})`)
  )

  addTitle ({sg,gn,title})

  // bind to the updated data
  const layer = sg.selectAll('.layer')
    .data(layers, d=>d)
    .join(
      enter=> {
        const e = enter.append('g')
          .attr('class', 'layer')
          .attr("fill",d=>color(d.key))
        
        e.append('title')
          .attr('class','bartip')
          .text((d,i)=>{
            return d.key
          })

        return e
      },
      update=>update,
      exit=>exit.remove()
    ) 

  const join  = selection => 
    selection
      .attr("y", d=> yScale(yGet(d)))
      .attr("x", d=> xScale(d[0]))
      .attr("width", d=>  xScale(d[1]) - xScale(d[0]))
    

  // make rectangles for each layer
  layer.selectAll ('.rect')
    .data(d=>d)
    .join(
      enter=> enter
        .append("rect")
          .attr('class', 'rect')
          .attr("height", yScale.bandwidth())
        .call(join),
      update => update.call(join),
      exit => exit.remove()
    )


  getStore(gn+'_xaxis',()=>sg.append("g")
    .attr("class", "axis bar axis--x")
    .attr("transform", "translate(0," + (height+5) + ")"))
    .call(xAxis)

  getStore(gn+'_yaxis',()=>sg.append("g")
    .attr("class", "axis bar axis--y")
    .attr("transform", "translate(0,0)"))
    .call(yAxis)

}

// area chart tracking states over time
const updateStatsChart = () => {
  // normalize for d3 area data
  const { dimensions, params, densities } = store
  const {statsChart} =  dimensions
  const {width:w, height:h} = statsChart
  // some margin for scales
  const m = store.dimensions.mTool
  const width = w - m.left
  const height = h - m.top - m.bottom
  const {states} = params
  const pn =  'stats_person'
  const gn = pn+'_chart'
 
  const svg = getStore('svg_chart')
  const sg = getStore(gn, ()=>
    svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
  )

  const data = getStore(pn)
  const keys = Object.keys(getStatsOb())

  // convert data to %ages
  const chartData = data.map(f=>{
    return keys.reduce((p,c)=>{ 
      p[c] = p[c]/densities.numPeople*100
      return p
    },{...f})
  })
  const series = d3Stack().keys(keys)(chartData)
  const color = (key) =>  stateScheme[states[key].color]

  // Add X axis
  const x = d3ScaleLinear().rangeRound([0, width])
    .domain(d3Extent(data, d => d.simTime))


  fStore(gn+'_xaxis', () => sg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .attr("class", "axis bar axis--x")
  ).call(d3AxisBottom(x).ticks(8))

  // Add Y axis label:
  fStore(gn+'_ylabel', () => sg.append("text"))
    .attr("text-anchor", "end")
    .attr("x", 0)
    .attr("y", -20 )
    .attr("text-anchor", "start")
  

  // Add Y axis
  const y = d3ScaleLinear()
  .domain([0, 100])
  .range([ height, 0 ]);

  fStore(gn+'_yaxis', 
    ()=>sg.append("g").attr("class", "axis bar axis--y")).call(d3AxisLeft(y).ticks(9))
  

  // Area generator
  const area = d3Area()
    .x(function(d) { return x(d.data.simTime); })
    .y0(function(d) { return y(d[0]); })
    .y1(function(d) { return y(d[1]); })

 const areaChart = fStore(gn+'_areachart', ()=> sg.append('g'))

  areaChart
  .selectAll("mylayers")
  .data(series, d=>d)
  .join(
    enter => enter.append("path")
      .attr("class", function(d) { return "mylayers " + d.key })
      .style("fill", function(d) { return color(d.key); })
      .attr("d",area)
      .append("title")
      .text(({key}) => key),
    update => update,
    exit => exit.remove()
  )
}

// get latest overall stats
const getCurrentStats = () => {
  const everybody = getEverybody()
  const simTime = store.simTime
  const stats = getStatsOb()
  everybody.forEach(node=>walkStats({node,stats}))

  return {
    ...stats,
    simTime
  }
}

// will walk through each nodes current states to summarize - used for reporting and tooltips
const walkStats = ({node, stats}) => {
  // recurse if there's children

  (node.simNode.members || []).forEach(node=>walkStats({node, stats}))
  
  if(node.props.hasOwnProperty("state") && node.props.state) {
    stats[node.props.state.value]++
  }
  
  return stats
}

// const get where someone is heading for - using in logging
const headingFor = ({node}) => {
  const {simNode} = node
  if (simNode.isMoving) {
    return `going to ${simNode.destinationData.props.name}`
  } else if (simNode.isAtHome) {
    return `chez ${simNode.homeData.props.name}`
  } else if (simNode.isVisiting) {
    return `visiting ${simNode.visitData.props.name}`
  } else {
    console.log('no idea where this is', node)
    return `${simNode.destinationData.props.name} is lost`
  }
}
// just get the labels for each possible state
const getStatsOb  = () => {
  const { params } = store
  const {states} =  params
  return Object.keys(states).reduce((p,c) => {
    p[c] = 0
    return p
  },{})
}

// get accumulated stats for every item state
const getStats = ({node}) => {

  const stats = getStatsOb()
  let {name} = node.props
  // collect all children and this stats
  walkStats ({node, stats})
  
  const rendered =  node.simNode.type === 'person' 
    ? `${node.fullName} is ${node.props.state.value} and ${headingFor({node})}` 
    : `<table><tbody>${
      Object.keys(stats)
      .filter(s=>stats[s])
      .map(s=>'<tr><td>'+s+'</td><td>'+stats[s]+'</td></tr>').join('')}</tbody></table>`

  return {
    stats,
    node,
    name,
    rendered
  }
}

// add to the logs, and report
export const addLog =({eventType, source, target, placeFrom, placeTo}) => {

  let text = ''
  const family = source && target && source.simNode.homeIdx === target.simNode.homeIdx
  if (eventType === 'infect') {
    const name = placeTo.props.name
    const where = target.simNode.isMoving ? ` going to ${name}` : ` ${target.simNode.isAtHome ? 'chez':'visiting'} ${name}`
    text = `${source.fullName} infected ${target.fullName}${where}`
  } else if (eventType === 'visit' ) {
    text = `${source.fullName} leaves for ${placeTo.props.name}`
  } else if (eventType === 'home' ) {
    text = `${source.fullName} goes home` 
  } else if (eventType === 'visit-ends' ) {
     text = `${source.fullName} arrives at ${placeTo.props.name}`
  } else if (eventType === 'home-ends' ) {
    text = `${source.fullName} arrives home`
  } else if (eventType === 'die' ) {
    text = `${source.fullName} died`
  } else if (eventType === 'recover' ) {
    text = `${source.fullName} recovered`
  } else {
    text =`no idea what happened to ${source.fullName}`
  }
  const e = {
    eventType,
    fromIdx: placeFrom && placeFrom.idx,
    toIdx: placeTo && placeTo.idx,
    simTime: store.simTime,
    source: source && source.simNode.idx,
    target: target && target.simNode.idx,
    family,
    text
  }

  if(source) source.props.log = e
  if(target) target.props.log = e

  logEvent ({ eventType, simTime:e.simTime, text:`<span style="color:${source.props.color}">${text}</span>`})
}  

// display log events
export const logEvent =({text,simTime,eventType}) => {
  // it's possible that finishing transitions are being written after a reset
  const logs = getStore('eventlog_data',()=>[]) 
  const {params} = store
  const {maxLog} = params.logs
  const event = ['infect','die','recover'].indexOf(eventType) !== -1
  logs.push ({
    simTime,
    text,
    eventType,
    event
  })
  const shouldShow = (ob) => ((ob.event && userStates.showLogEvents) || (!ob.event && userStates.showLogMoves))
  
  // TODO convert this to d3 join - could also optimize a bit by detecting if cariteria for showing has changed
  getStore('eventlog')
    .html(logs
      .filter(f=>shouldShow(f))
      .slice(-maxLog)
      .map(d=>`<div>${formatSimTime(d.simTime)} ${d.text}</div>`)
      .reverse()
      .join(''))
 
}

// get the root svg element for the viz
export const getSvg = ({element='body'}) => {
  const {dimensions, setStore} = store
  const { eventLog,table, statsChart,spreader, clock, vizHeight, vizWidth, widget, lineChart} = dimensions
  // get rid of any other
  d3Select("svg").remove();

  setStore('element',d3Select(element) )

  // event log
  setStore('eventlog', getStore('element').append("div")
  .attr("class", "eventlog")
  .style("top",`${eventLog.margin.top}px`)
  .style("left",`${eventLog.margin.left}px`)
  .style("max-width",`${eventLog.width}px`)
  .style("max-height",`${eventLog.height}px`)
  .style("width",`${eventLog.width}px`)
  )

  // make the root
  const svg = getStore('element')
    .append("svg")
    .attr("viewBox", [0, 0, vizWidth, vizHeight]);

  setStore('svg', svg)

  setStore('svg_widget', 
    svg.append("g").attr("transform",`translate(${widget.margin.left},${widget.margin.top})`)
  )

  setStore ('svg_clock', 
    svg.append("g").attr("transform",`translate(${clock.margin.left},${clock.margin.top})`))
  
  setStore ('svg_chart', 
    svg.append("g").attr("transform",`translate(${statsChart.margin.left},${statsChart.margin.top})`))

  setStore ('svg_r0', 
    svg.append("g").attr("transform",`translate(${lineChart.margin.left},${lineChart.margin.top})`))
  
  setStore ('svg_bar', 
    svg.append("g").attr("transform",`translate(${table.margin.left},${table.margin.top})`))
  
  setStore ('svg_spreader', 
    svg.append("g").attr("transform",`translate(${spreader.margin.left},${spreader.margin.top})`))

    // Define the div for the tooltip
  getStore('element').append("div")
    .style("visibility","hidden")	
    .attr("class", "tooltip")	
    .style("opacity", 0);

  return svg

}

// called on mouseout from a tooltip
const hideTooltip = () => {
  const tooltip = d3Select('.tooltip')
  tooltip.style("visibility","hidden")
  return tooltip
}

// called on mouseover from a tooltip
const showTooltip = ({node}) => {
  const {params} = store
  const tooltip = d3Select('.tooltip')

  tooltip
    .style("visibility","visible")
    .transition()		
    .duration(500)
    .style("opacity", .9);

  const stats = getStats ({node, params})
  const log = node.props.hasOwnProperty('log') && node.props.log.length
    ? node.props.log.slice().reverse().map(l=>`<div>${formatSimTime(l.value.simTime)} ${l.value.text}</div>`).join('')
    : ''

  tooltip.html(`
      <div style="font-weight:bold;">${node.simNode.kind || node.simNode.type}:${stats.name}</div>
      <div>${stats.rendered}</div>
      <span>${log}</span>
    `)
  tooltip
    .style("left", (d3Event.pageX) + "px")		
    .style("top", (Math.max(0,d3Event.pageY - tooltip.node().getBoundingClientRect().height) + "px"))
    return tooltip
}
// just a shortcut
export const getSelection = ({type}) => {
  const selection = d3SelectAll (`.${type}-nodes`)
  return selection
}
// get all known nodes
const getEverybody = () =>  {
  const {densities} = store
  const everybody = getSelection({type: 'person'}).data()
  return everybody
}

// reusable drawer - can handle all node types
export const drawNodes  = ({type, data , kind}) => {
  // create or get the container for the nodes
  const gn = 'svg_group_'+ type
  const svg = getStore('svg')
  kind = kind || type
  setStore(gn, hasStore(gn) ? getStore(gn) : svg.append('g'))

  // first time in , we wont have any data available
  data = data || getStore(type)

  const join = selection => 
    selection.text(d => d.simNode.idx)
      .attr("class",`${type}-nodes ${kind}-kind`)
      .on("mouseover", node=>showTooltip({node}))
      .on("mouseout", d=>hideTooltip())
      .style("fill",d=> d.props.color)
      .style("fill-opacity",d=>0.8)
      .attr("r",d=>d.simNode.radius)
      .attr("cx", d=>cn(d.x))
      .attr("cy",d=>cn(d.y))
  
  const g = getStore(gn)
    .selectAll(`.${type}-nodes`)
  .data(data, d=>d.simNode.idx)
    .join(
      enter=> {
        return enter.append("circle")
        .call(join)
      },
      update=>update.call(join),
      exit=>exit.remove()
    )

  return {
    g: setStore('svg_g_'+type, g),
    type
  }
}

// this does a negotiation on whether a or b infect each other
export const infect = (a,b) => {
  const ad = a.datum()
  const bd = b.datum()

  const ob = store.params.probabilities.gotInfected(ad,bd)
  if(ob.infected) {
    let sd = null;
    let td = null;
    if (ad.simNode.idx === ob.source.simNode.idx) {
      sd = ad
      td = bd
      ob.os = a
      ob.ot = b
    } else {
      sd = bd
      td = ad
      ob.os = b
      ob.ot = a
    }

    td.props.state = 'infected'
    ob.ot.style('fill', d=>d.props.color)
    addLog ({eventType:'infect', source:sd, target:td, placeFrom: null, placeTo: td.simNode.destinationData})
    // also store this event in history of the infector to calculate r0

  }
  
  return ob
}

// shared slider maker
export const doSlider = ({id, onChange, top, label, initial}) => {
  const g = getStore('svg_widget')
  const {dimensions} = store
  const {widget} = dimensions

  return fStore(id, ()=> {
    
    const sliderSimple = d3slider
      .sliderHorizontal()
      .min(0.1)
      .max(1)
      .step(1/9)
      .width(widget.width - widget.margin.left - widget.margin.right)
      .tickFormat(d3Format('.1'))
      .ticks(0.1)
      .default(initial)
      .displayValue(false)
      .on('onchange', value => {
        onChange({id, value})
      });

    transform({g: g.append("g"),x:widget.width - widget.margin.right + widget.padding,y: top + widget.padding})
      .append('text')
      .text(label)

    transform({g:g.append("g"), y: top})
      .call(sliderSimple)
    
    return sliderSimple
  })

}

export const drawSliderRate = () => doSlider({ 
  id:'widget_slider_rate', 
  top: store.dimensions.widget.itemHeight *0,
  label: 'Viz rate',
  initial: userStates.rate,
  onChange: ({id, value}) => {
    userStates.rate = value
  } 
})


export const drawCapacity = () =>  doSlider({ 
  id:'widget_slider_capacity', 
  top: store.dimensions.widget.itemHeight *1,
  label: 'Capacity',
  initial: userStates.capacity,
  onChange: ({id, value}) => {
    userStates.capacity = value
  } 
})

export const drawCompliance = () =>  doSlider({ 
  id:'widget_slider_compliance', 
  top: store.dimensions.widget.itemHeight *2,
  label: 'Compliance',
  initial: userStates.compliance,
  onChange: ({id, value}) => {
    userStates.compliance = value
  } 
})
export const drawSliderPeople = () => doSlider({ 
  id:'widget_slider_people', 
  top: store.dimensions.widget.itemHeight *3,
  label: 'Number of people',
  initial: userStates.numPeople,
  onChange: ({id, value}) => {
    vizClear().then(()=> {
      userStates.numPeople = value
      vizInit()
    })
  } 
})

export const drawReset = () => drawForeign({ 
  id:'widget_reset', 
  top: store.dimensions.widget.itemHeight *4,
  html: `<button>Reset</button>`,
  onClick: ({id}) => {
    vizClear().then(()=>waitABit(0)).then(()=>vizInit())
  } 
})

export const drawLogEvents = () => {
  const id = 'widget_logevents'
  drawForeign({ 
    id,
    top: store.dimensions.widget.itemHeight *4,
    left: 60,
    html: `<label>Show log events</label><input type="checkbox" id="${id}">`
  })
  d3Select(`#${id}`).property("checked",  userStates.showLogEvents)
  d3Select(`#${id}`).on("change",function () {
    userStates.showLogEvents = d3Select(this).property("checked")
  })
}

export const drawLogMoves = () => {
  const id = 'widget_logmoves'
  drawForeign({ 
    id,
    top: store.dimensions.widget.itemHeight *4,
    left: 140,
    html: `<label>moves</label><input type="checkbox" id="${id}">`
  })
  d3Select(`#${id}`).property("checked",  userStates.showLogMoves)
  d3Select(`#${id}`).on("change",function () {
    userStates.showLogMoves = d3Select(this).property("checked")
  })
}
// used for embedding a foreign object inside an svg
export const drawForeign = ({id, onChange, onClick, top, html , left = 0}) => {

  const g = getStore('svg_widget')
  const {dimensions} = store
  const {widget} = dimensions

  return fStore(id, ()=> {
    const t = transform({g: g.append("g"),x: left,y: top + widget.padding})
      .append("foreignObject")
        .attr("width", widget.width - widget.margin.left - widget.margin.right)
        .attr("height", dimensions.widget.itemHeight)
      
      t.append("xhtml:div")
        .html(html)
      
      t.on('click', () => onClick ? onClick({id}) : null)
      t.on('change',() => onChange ? onChange({id, value: t.value}) : null)
      
  })

}
// just a short cut for those annoying transform/translate dialogs
const transform =({g,x,y}) => g.attr('transform',`translate(${x || 0},${y || 0})`)

// draw the clock
export const drawClock = () => {

  const {dimensions} = store
  const {clock:cd} = dimensions
  const {width:w, height:h} = cd
  // some margin for scales
  const m = store.dimensions.mTool
  const width = w - m.left - m.right

  if(!hasStore('clock')){
    const translate = `translate(${m.left + width/2},${m.left + width/2})`
    setStore('clock',getStore('svg_clock').append("g").attr('transform', translate))
  }
  const g = getStore('clock')

  if (!hasStore('d3clock')) {
    setStore('d3clock', d3Clock.init({
      width,
      g,
      func: () => store.getSimTimeClock()
    }))
  }

}
// reusable tabulator - actually deprecated but keep here in case i resurrect
const tabulate = ({data, headings,thead, tbody}) => {

	// append the header row
	thead.selectAll('th')
    .data(headings, d=>d)
    .join('th')
      .text(d=>d)
      .style('text-align', 'right')

	// create a row for each object in the data
	tbody.selectAll('tr')
	  .data(data)
	  .join('tr')
    .selectAll('td')
	  .data(row=>headings.map(h=>row[h]))
	  .join('td')
      .text(d=>d)
      .style('text-align', 'right')
}

// things that get run if a new viz is requested
export const vizInit = () => {

  if(!store.isReady()) throw 'store wasnt ready on init attempt'
  if(store.size()) throw 'store wasnt empty on init attempt'
  
  // create svg dom element root
  getSvg({dimensions})

  // schedule the clock start
  setStore('interval_tick',d3Interval(()=> store.simTimeTick(), store.params.scale.simTimeTickRate))
  
  // draw all the widgets
  drawClock()
  drawSliderRate()
  drawCompliance()
  drawCapacity()
  drawSliderPeople()
  drawReset()
  drawLogEvents()
  drawLogMoves()


  // Generate random population data
  seedInit()
  seedAreas()
  seedPlaces()
  seedPeople()
  startPositions({type: 'area'})


  // draw the nodes and start the various sims, waiting for them to cool down a bit before creating the next
  const sims = () => 
    sim(drawNodes ({type: 'area'}))
    .then((sim)=> waitABit(1000).then(()=> sim.stop()))
    .then(()=>{
      // the start positions are based on the settled positions of the parent
      startPositions({type: 'place'})
      return sim(drawNodes ({type: 'place'}))
    })
    .then((sim)=> waitABit(1000).then(()=> sim.stop()))
    .then(()=> waitABit(1000))
    .then(()=> {
      // generate some random initial state values for the people population
      seedInitialStates()
      startPositions({type: 'person'})
      return sim(drawNodes ({type: 'person'}))
    })

    // start the whole thing off
    sims()
    .then(()=>{
      // kick off stats collector
      startCollecting()
      // start moving people around
      startMoving () 
    })
  
}
//if the viz gets reset, there;s a lot of stuff to clear away
export const vizClear = () => {
  // clear previous if it exists
  if(store.isReady()){
    // remove any intervals
    const sims = ['sim_person','sim_place','sim_area'].forEach(f=> {
      if(store.hasStore(f)) {

        const sim = store.getStore(f)
        sim.alpha(0).nodes([])
        sim.stop()
   
      }
    })


    d3TimerFlush()
    const timers = ['interval_move','interval_viz','interval_tick','interval_stats']
    timers.forEach(f=>{
      if(store.hasStore(f)) {
        store.getStore(f).stop()
      }
    })

    // clear out all the svg stuff
    if (store.hasStore('svg')) {
      d3SelectAll('*').transition();
    }

    // remove the svg
    d3Select('svg').remove()

    // remove any html sections
    if(store.hasStore('element')) {
      store.getStore('element').html('')
    }
    
    // finally clear it all away after leaving a little time to cool down
    return waitABit(1000).then(()=>store.clear())
  } else {
    return Promise.resolve()
  }
  
}