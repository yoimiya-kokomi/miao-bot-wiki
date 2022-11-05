/*
* 面板圣遗物
* */
import lodash from 'lodash'
import Base from './Base.js'
import { Artifact, ArtifactSet, Character } from './index.js'
import { Format, Data } from '../components/index.js'
import ArtisMark from './profile-lib/ArtisMark.js'
import { attrMap, attrNameMap, attrValue } from '../resources/meta/artifact/artis-mark.js'
import CharArtis from './profile-lib/CharArtis.js'

export default class ProfileArtis extends Base {
  constructor (charid = 0, ds = false) {
    super()
    this.charid = charid
    this.artis = {}
    if (ds) {
      this.setArtisSet(ds)
    }
  }

  setProfile (profile, artis) {
    this.profile = profile
    this.setArtisSet(artis)
  }

  setArtisSet (ds) {
    for (let key in ds) {
      this.setArtis(key, ds[key] || {})
    }
  }

  setArtis (idx = 1, ds = {}) {
    idx = idx.toString().replace('arti', '')
    let ret = {}
    ret.name = ds.name || ArtifactSet.getArtiNameBySet(ds.set, idx) || ''
    ret.set = ds.set || Artifact.getSetNameByArti(ret.name) || ''
    ret.level = ds.level || 1
    ret.main = ArtisMark.formatAttr(ds.main || {})
    ret.attrs = []
    for (let attrIdx in ds.attrs || []) {
      if (ds.attrs[attrIdx]) {
        ret.attrs.push(ArtisMark.formatAttr(ds.attrs[attrIdx]))
      }
    }
    this.artis[idx] = ret
  }

  forEach (fn) {
    lodash.forEach(this.artis, (ds, idx) => {
      if (ds.name) {
        fn(ds, idx)
      }
    })
  }

  _get (key) {
    let artis = this.artis
    switch (key) {
      case 'length':
        return lodash.keys(artis).length
    }
    if (artis[key]) {
      return artis[key]
    }
  }

  toJSON () {
    return this.getData('1,2,3,4,5')
  }

  get sets () {
    return this.getSetData().sets || {}
  }

  get names () {
    return this.getSetData().names || []
  }

  mainAttr (idx = '') {
    if (!idx) {
      let ret = {}
      for (let i = 1; i <= 5; i++) {
        ret[i] = this.mainAttr(i)
      }
      return ret
    }
    let main = this.artis[idx]?.main
    if (!main) {
      return ''
    }
    let title = main.title
    if (/元素伤害/.test(title)) {
      return 'dmg'
    }
    if (attrNameMap[main.title]) {
      return attrNameMap[main.title]
    } else {
      console.log(main.title)
    }
    return ''
  }

  is (check, pos = '') {
    if (pos) {
      return this.isAttr(check, pos)
    }
    let sets = this.getSetData()?.abbrs || []
    let ret = false
    Data.eachStr(check, (s) => {
      if (sets.includes(s)) {
        ret = true
        return false
      }
    })
    return ret
  }

  isAttr (attr, pos = '3,4,5') {
    let mainAttr = this.mainAttr()
    let check = true
    Data.eachStr(pos.toString(), (p) => {
      if (!attr.split(',').includes(mainAttr[p])) {
        check = false
        return false
      }
    })
    return check
  }

  getArtisData () {
    let ret = {}
    this.forEach((ds, idx) => {
      let arti = Artifact.get(ds.name)
      ret[idx] = {
        ...ds,
        name: arti.name,
        img: arti.img
      }
    })
    return ret
  }

  getSetData () {
    if (this._setData) {
      return this._setData
    }
    let setCount = {}
    this.forEach((arti, idx) => {
      setCount[arti.set] = (setCount[arti.set] || 0) + 1
    })
    let sets = {}
    let names = []
    let imgs = []
    let abbrs = []
    let abbrs2 = []
    for (let set in setCount) {
      if (setCount[set] >= 2) {
        let count = setCount[set] >= 4 ? 4 : 2
        sets[set] = count
        let artiSet = ArtifactSet.get(set)
        names.push(artiSet.name)
        imgs.push(artiSet.img)
        abbrs.push(artiSet.abbr + count)
        abbrs2.push(artiSet.name + count)
      }
    }
    this._setData = {
      sets,
      names,
      imgs,
      abbrs: [...abbrs, ...abbrs2],
      name: abbrs.length > 1 ? abbrs.join('+') : abbrs2[0]
    }
    return this._setData
  }

  getCharCfg () {
    let char = Character.get(this.charid)
    let { attrWeight, title } = CharArtis.getCharArtisCfg(char, this.profile, this)
    let attrs = {}
    let baseAttr = char.baseAttr || { hp: 14000, atk: 230, def: 700 }
    lodash.forEach(attrMap, (attr, key) => {
      let k = attr.base || ''
      let weight = attrWeight[k || key]
      if (!weight || weight * 1 === 0) {
        return true
      }
      let ret = {
        ...attr,
        weight,
        fixWeight: weight,
        mark: weight / attrValue[key]
      }
      if (!k) {
        ret.mark = weight / attrValue[key]
      } else {
        let plus = k === 'atk' ? 520 : 0
        ret.mark = weight / attrValue[k] / (baseAttr[k] + plus) * 100
        ret.fixWeight = weight * attr.value / attrMap[k].value / (baseAttr[k] + plus) * 100
      }
      attrs[key] = ret
    })
    let maxMark = ArtisMark.getMaxMark(attrs)
    // 返回内容待梳理简化
    return {
      attrs,
      classTitle: title,
      weight: attrWeight,
      // 待删除
      mark: lodash.mapValues(attrs, (ds) => ds.mark),
      maxMark
    }
  }

  getMarkDetail (withDetail = true) {
    let charCfg = this.getCharCfg()
    let artis = {}
    let setCount = {}
    let usefulMark = {}
    lodash.forEach(charCfg.attrs, (ds) => {
      usefulMark[ds.title] = ds.weight
    })
    let totalMark = 0
    this.forEach((arti, idx) => {
      let mark = ArtisMark.getMark(charCfg, idx, arti.main, arti.attrs)
      totalMark += mark
      setCount[arti.set] = (setCount[arti.set] || 0) + 1
      if (!withDetail) {
        artis[idx] = {
          _mark: mark,
          mark: Format.comma(mark, 1),
          markClass: ArtisMark.getMarkClass(mark)
        }
      } else {
        let artifact = Artifact.get(arti.name)
        artis[idx] = {
          name: artifact.name,
          set: artifact.setName,
          img: artifact.img,
          level: arti.level,
          _mark: mark,
          mark: Format.comma(mark, 1),
          markClass: ArtisMark.getMarkClass(mark),
          main: ArtisMark.formatArti(arti.main, charCfg.mark, true),
          attrs: ArtisMark.formatArti(arti.attrs, charCfg.mark)
        }
      }
    })
    let sets = {}
    let names = []
    let imgs = []
    for (let set in setCount) {
      if (setCount[set] >= 2) {
        sets[set] = setCount[set] >= 4 ? 4 : 2
        let artiSet = ArtifactSet.get(set)
        imgs.push(artiSet.img)
        names.push(artiSet.name)
      }
    }
    this.mark = totalMark
    this.markClass = ArtisMark.getMarkClass(totalMark / 5)
    let ret = {
      mark: Format.comma(totalMark, 1),
      _mark: totalMark,
      markClass: ArtisMark.getMarkClass(totalMark / 5),
      artis,
      sets,
      names,
      imgs,
      classTitle: charCfg.classTitle
    }
    if (withDetail) {
      ret.usefulMark = usefulMark
    }
    return ret
  }
}
