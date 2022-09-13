import HutaoApi from '../stat/HutaoApi.js';
import lodash from 'lodash';
import { Format } from '../../components/index.js';
import { Artifact, Weapon } from '../../models/index.js';

let CharWiki = {
  // 命座持有
  async getHolding (id) {
    let consData = (await HutaoApi.getCons()).data || {}
    consData = lodash.find(consData, (ds) => ds.avatar === id)
    let holding = {}
    if (consData) {
      let { holdingRate, rate } = consData
      rate = lodash.sortBy(rate, 'id')
      holding.num = Format.percent(holdingRate)
      holding.cons = []
      lodash.forEach(rate, (ds) => {
        holding.cons.push({
          cons: ds.id,
          num: Format.percent(ds.value)
        })
      })
    }
    return holding
  },
  async getWeapons (id) {
    let wu = (await HutaoApi.getWeaponUsage()).data || {}
    let weapons = []
    if (wu[id]) {
      lodash.forEach(wu[id], (ds) => {
        let weapon = Weapon.get(ds.name) || {}
        weapons.push({
          ...weapon.getData('name,abbr,img,star'),
          value: ds.value
        })
      })
    }
    weapons = lodash.sortBy(weapons, 'value')
    weapons = weapons.reverse()
    lodash.forEach(weapons, (ds) => {
      ds.value = Format.percent(ds.value, 1)
    })
    return weapons
  },
  async getArtis (id) {
    let au = (await HutaoApi.getArtisUsage()).data || {}
    let artis = []
    if (au[id]) {
      let sets = {}
      lodash.forEach(au[id], (ds) => {
        let names = []
        let abbrs = []
        let ss = ds.sets.split(',')
        lodash.forEach(ss, (t) => {
          t = t.split(':')
          let tmp = Artifact.getArtiBySet(t[0])
          if (tmp) {
            names.push(tmp)
            abbrs.push(Artifact.getAbbrBySet(t[0]) + (ss.length === 1 ? t[1] : ''))
          }
        })

        artis.push({
          sets: names,
          title: abbrs.join('+'),
          value: ds.value
        })
      })
    }
    artis = lodash.sortBy(artis, 'value')
    artis = artis.reverse()
    artis.forEach((ds) => {
      ds.value = Format.percent(ds.value)
    })
    return artis
  }
}
export default CharWiki
