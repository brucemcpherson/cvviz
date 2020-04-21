import {
  scaleLinear as d3ScaleLinear,
  select as d3Select
} from 'd3'
import {axisRadialInner} from 'd3-radial-axis'
// adpated from https://bl.ocks.org/vasturiano/118e167e9bc93356221f67905c87cd6f
export const d3Clock = ((ns)=>{

  let r = 0;
  let vis = null;
  let getDate = null;
  let mclock = null;
  const secMinScale = d3ScaleLinear().domain([0, 60]).range([0, 360])
  const hourScale = d3ScaleLinear().domain([0, 12]).range([0, 360])
  const pointersRelDimensions = [
    { class: 'hour', width: 0.05, height: 0.55 },
    { class: 'min', width: 0.05, height: 0.85 },
    //{ class: 'sec', width: 0.02, height: 0.85 }
  ]

  ns.init = ({g,width,func}) => {
    r = width/2
    vis = g
    getDate = func  || (() => new Date().getTime())
    
    // Add background
    vis.append('circle').classed('background', true)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', r)


    // Add axis
      vis.append('g').classed('minor-ticks', true)
        .call(axisRadialInner(
              secMinScale.copy().range([0, 2 * Math.PI]),
              r  + 5
          ).ticks(60).tickSize(4)
        )
      // should be able to aply labels but assig
      vis.append('g').classed('axis', true)
        .call(axisRadialInner(
              hourScale.copy().range([0, 2 * Math.PI]),
              r + 5
          ).ticks(12).tickSize(8)
        )

       vis.selectAll('.domain').each(function (d,i) {
         // there's a bug with this radial thing that adds an extra circle
         // life's too short to find out why so i'll just remove them all except the first one
         if(i) {
          d3Select(this).remove()
         }
       })


    // Add pointers
    vis.append('g').classed('pointers', true)
      .attr('transform', `scale(${r})`)
      .selectAll('rect')
        .data(pointersRelDimensions)
        .enter()
          .append('rect')
          .attr('class', d=> d.class)
          .attr('x', d => -d.width/2)
          .attr('y', d => -d.height + d.width/2)
          .attr('width', d => d.width)
          .attr('height', d => d.height)
          .attr('rx', 0.02)
          .attr('ry', 0.03)

    // Add center
    vis.select('.pointers')
      .append('circle').classed('center', true)
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 0.02)
    
    vis.append('rect')
      .attr('class', 'digitalclock')
      .attr('transform', `translate(${-r/4},${-r/2})`)
      .attr('height', 20)
      .attr('width',r/2)

    mclock = vis.append('text')
    .attr('class','digitalclock')
    .attr('text-anchor','middle')
    .attr('transform', `translate(0,${-r/2+13.5})`)

    
    // start the clock
    framed()
    
  }

  function framed() {
    const dob = getDate()
    const dt = new Date(dob.date)

    const ms = dt.getMilliseconds(),
      secs = dt.getSeconds() + ms/1000,
      mins = dt.getMinutes() + secs/60,
      hours = dt.getHours()%12 + mins/60

    d3Select('.pointers .hour').attr('transform', `rotate(${hourScale(hours)})`)
    d3Select('.pointers .min').attr('transform', `rotate(${secMinScale(mins)})`)
    // d3Select('.pointers .sec').attr('transform', `rotate(${secMinScale(secs)})`)

    //mclock.transition().text(d3TimeFormat("day %d %H:%M")(dt))
    mclock.transition().text(dob.simTimeClock.toFixed(2))
    requestAnimationFrame(framed)
    
  }
  return ns;

})({})

