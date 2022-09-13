import lodash from 'lodash'
import Base from './Base.js'
import { Data } from '../components/index.js'
import WeaponMeta from './weapon/WeaponMeta.js'

let data = Data.readJSON('resources/meta/weapons/data.json')
let wData = {}
lodash.forEach(data, (ds) => {
  wData[ds.name] = ds
})

class Weapon extends Base {
  constructor (name) {
    super(name)
    let meta = wData[name]
    if (!meta) {
      return false
    }
    let cache = this._getCache(`weapon:${name}`)
    if (cache) {
      return cache
    }
    this.name = meta.name
    this.meta = meta
    this.type = meta.type
    this.star = meta.star
    return this._cache()
  }

  get abbr () {
    return WeaponMeta.getAbbr(this.name)
  }

  get title () {
    return this.name
  }

  get img () {
    return `meta/weapons/icon/${this.name}.png`
  }

  get icon () {
    return this.img
  }
}

Weapon.get = function (name) {
  if (wData[name]) {
    return new Weapon(name)
  }
  return false
}

export default Weapon
