import { store } from './store'
const { getStore } = store

export default class SimNode {

  constructor (initial) {
    // for convenience, just property everthing passed
    Object.keys(initial).forEach(f=>this[f] = initial[f])
    this.seed = Math.random()

    // always return here when a visit is over
    this.homeIdx = Math.floor(Math.random() * this.homeSize)
    // a place I've been send to visit
    this._visitIdx = -1
    // the place I currently am
    this._currentIdx = this.homeIdx
    this._radius = store.params[this.type] && store.params[this.type].radius || store.dimensions.baseRadius
  }
  get visitStartedAt () {
    return this._visitStartedAt
  }
  // set when node arrives at destination
  set currentIdx(val) {
    this._currentIdx = val
  }

  get currentIdx() {
    return this._currentIdx
  }

  // the specific data that is currently my parent/home/visiting
  get currentData () {
    if (!this.homeType || this.currentIdx === -1) return null
    return getStore(this.homeType)[this.currentIdx]
  }
  // the place we're heading for
  get destinationData () {
    return (this.isMoving && (this.visitIdx === -1 ? this.homeData : this.visitData)) || this.currentData
  }

  get visitData () {
    if (!this.homeType || this.visitIdx === -1) return null
    return getStore(this.homeType)[this.visitIdx]
  }
  get homeData () {
    if (!this.homeType || this.homeIdx === -1) return null
    return getStore(this.homeType)[this.homeIdx]
  }
  get isMoving () {
    return this.currentIdx === -1
  }
  get isAtHome () {
    return this.currentIdx === this.homeIdx && !this.isMoving
  }
  get isVisiting () {
    return this.currentIdx === this.visitIdx && !this.isMoving
  }
  // visitIdx is set when node is set off on a visit
  set visitIdx(val) {
    this._visitStartedAt = store.simTime
    this._visitIdx = val
  }

  get visitIdx() {
    return this._visitIdx
  }

  // these are the force parameters for this type of node
  get vp () {
    return store.params[this.type]
  }
  // the children of this node if it has any
  get members () {
    return this.memberType && getStore(this.memberType).filter(f=>f.simNode.currentIdx === this.idx)
  }
  // radius gets big enough to house everyone in it
  get radius () {
    return this._radius
  }
  set radius(value) {
    this._radius = value
  }
   
}

