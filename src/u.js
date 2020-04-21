  // make a bounding box
  export const bbox = ({width,height,x,y}) => ({
    width,
    height,
    x,
    y,
    radius: Math.min(width, height)/2
  })
  // how far away are two circles from each other
  export const distanceFrom = ({cxa,cya,cxb,cyb}) => {
    const dx = cxa - cxb
    const dy = cya - cyb
    return {
      h: Math.hypot(dx,dy),
      dx,
      dy,
      cxa,
      cxb,
      cya,
      cyb
    }
  }
  // is a circle colliding
  export const collide = ({cxa,cya,cxb,cyb,ra,rb,sd}) => {
    const d = distanceFrom ({cxa,cya,cxb,cyb})
    return {
      ...d,
      ra,
      rb,
      sd,
      // radiuses and padding are less than the distance between
      isColliding: d.h < ra + rb + sd 
    }
  }
  // radius is of the outer circle
  export const isInside = ({x,cx,y,cy,r}) =>(x-cx)*(x-cx) + (y-cy)*(y-cy) < r*r
  
  export const waitABit = (ms = 2000, id ) => new Promise((resolve)=>setTimeout(()=>resolve(id),ms))

  export const randomInsideCircle = ({x,y,radius}) => {
    // generate a random angle
    const angle = Math.random() * 2 * Math.PI;
    // and a random radius
    const rs = Math.random() * radius * radius
    const rq = Math.sqrt(rs)
    const rx = rq * Math.cos(angle)
    const ry = rq * Math.sin(angle)
    const xy = {
      x: rx + x,
      y: ry + y,
    }

    return xy
  }
  export const expand = (r,size) => {
    const area =  Math.PI * r * r
    return Math.sqrt(area*(size || Math.PI/2 )/Math.PI)
  }

