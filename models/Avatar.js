import lodash from 'lodash'

import { Data, Format } from '#miao'
import { Character, ProfileDmg, Weapon } from './index.js'
import Base from './Base.js'
import Attr from './attr/Attr.js'
import Artis from './artis/Artis.js'
import ProfileAvatar from './avatar/ProfileAvatar.js'
import ArtisMark from './artis/ArtisMark.js'
import moment from 'moment'
import MysAvatar from './avatar/MysAvatar.js'

const charKey = 'name,abbr,sName,star,imgs,face,side,gacha,weaponTypeName'.split(',')

export default class Avatar extends Base {
  constructor (ds = {}, game = 'gs') {
    super()
    let char = Character.get({ id: ds.id, elem: ds.elem })
    if (!char) {
      return
    }
    this.id = char.id
    this.char = char
    this.game = char.game || game
    this._mysArtis = new Artis(this.game)
    this._artis = new Artis(this.game, true)
    this.setAvatar(ds)
  }

  get hasTalent () {
    return this.talent && !lodash.isEmpty(this.talent) && !!this._talent
  }

  get name () {
    return this.char?.name || ''
  }

  get costume () {
    let costume = this._costume
    if (lodash.isArray(costume)) {
      costume = costume[0]
    }
    return costume
  }

  get originalTalent () {
    return lodash.mapValues(this.talent, (ds) => ds.original)
  }

  // 已经到达当前等级的最大天赋
  get isMaxTalent () {
    let maxLv = [1, 2, 4, 6, 8, 10]?.[this.promote - 1] || 10
    let minTalent = lodash.min(lodash.map(this.talent, (ds) => ds.original))
    return minTalent >= maxLv
  }

  get mysArtis () {
    return this._mysArtis
  }

  /**
   * 获取圣遗物套装属性
   * @returns {boolean|*|{imgs: *[], names: *[], sets: {}, abbrs: *[], sName: string, name: (string|*)}|{}}
   */
  get artisSet () {
    return this.mysArtis.getSetData()
  }

  get dataSource () {
    return {
      enka: 'Enka.Network',
      miao: '喵喵Api',
      mgg: 'MiniGG-Api',
      hutao: 'Hutao-Enka',
      mys: '米游社',
      homo: 'Mihomo'
    }[this._source] || this._source
  }

  get updateTime () {
    let time = this._time
    if (!time) {
      return ''
    }
    if (lodash.isString(time)) {
      return moment(time).format('MM-DD HH:mm')
    }
    if (lodash.isNumber(time)) {
      return moment(new Date(time)).format('MM-DD HH:mm')
    }
    return ''
  }

  get isAvatar () {
    return true
  }

  // 是否是合法面板数据
  get isProfile () {
    return ProfileAvatar.isProfile(this)
  }

  // profile.hasData 别名
  get hasData () {
    return !!(this.level > 1 || this?.weapon?.name)
  }

  get imgs () {
    return this.char.getImgs(this.costume) || {}
  }

  get costumeSplash () {
    return ProfileAvatar.getCostumeSplash(this, this.game)
  }

  get hasDmg () {
    return this.isProfile && !!ProfileDmg.dmgRulePath(this.name, this.game)
  }

  get artis () {
    return this._artis
  }

  static create (ds, game = 'gs') {
    let profile = new Avatar(ds, game)
    if (!profile) {
      return false
    }
    return profile
  }

  _get (key) {
    if (charKey.includes(key)) {
      return this.char[key]
    }
  }

  /**
   * 设置角色基础数据
   * @param ds
   * @param source
   */
  setBasic (ds = {}, source = '') {
    const now = this._now || (new Date()) * 1
    this.level = ds.lv || ds.level || this.level || 1
    this.cons = ds.cons || this.cons || 0
    this.fetter = ds.fetter || this.fetter || 0
    this._costume = ds.costume || this._costume || 0
    this.elem = ds.elem || this.elem || this.char.elem || ''
    this.promote = Math.max((ds.promote ? ds.promote : this.promote) * 1 || 0, Attr.calcPromote(this.level, this.game))
    this.trees = this.trees || []
    this._source = ds._source || this._source || '' // 数据源
    this._time = ds._time || this._time || now // 面板最后更新时间
    this._update = ds._update || this._update || ds._time || now // 最后更新时间，包括mys
    this._talent = ds._talent || this._talent || ds._time || now // 最后天赋更新时间，包括mys

    if (ds.trees) {
      this.setTrees(ds.trees)
    }

    // 存在数据源时更新时间
    if (source) {
      this._update = now
      if (source !== 'mys') {
        this._source = source
        this._time = now
      } else {
        this._source = this._source || source
        this._time = this._source !== 'mys' ? (this._time || now) : now
      }
    }
  }

  // 星铁的行迹数据
  setTrees (ds) {
    this.trees = []
    let prefix = ''
    let map = {}
    lodash.forEach(this.char?.detail?.tree || {}, (ds, key) => {
      let ret = /(\d{4})(\d{3})/.exec(key)
      if (ret && ret[1] && ret[2]) {
        prefix = prefix || ret[1]
        map[ret[2]] = key
      }
    })
    if (prefix) {
      for (let i = 0; i <= 3; i++) {
        map[`10${i}`] = `${prefix}10${i}`
      }
    }
    lodash.forEach(ds, (id) => {
      let ret = /\d{4}(\d{3})/.exec(id)
      this.trees.push(map[ret?.[1] || id] || id)
    })
  }

  // 设置武器
  setWeapon (ds = {}) {
    let w = Weapon.get(ds.name || ds.id, this.game)
    if (!w) {
      return false
    }
    this.weapon = {
      id: ds.id || w.id,
      name: ds.name || w.name,
      level: ds.level || ds.lv || 1,
      promote: lodash.isUndefined(ds.promote) ? Attr.calcPromote(ds.level || ds.lv || 1, this.game) : (ds.promote || 0),
      affix: ds.affix,
      ...w.getData('star,abbr,type,img,imgs')
    }
    if (this.weapon.level < 20) {
      this.weapon.promote = 0
    }
  }

  // 获取武器详情信息
  getWeaponDetail () {
    let ret = {
      ...this.weapon
    }
    if (!ret.id) {
      return {}
    }
    let wData = Weapon.get(ret.id, this.game)
    ret.sName = wData.sName
    ret.splash = wData.imgs.gacha
    let wAttr = wData.calcAttr(ret.level, ret.promote)
    let attrs = {}
    if (this.isSr) {
      lodash.forEach(wAttr, (val, key) => {
        attrs[key] = Format.comma(val, 1)
      })
    } else if (this.isGs) {
      attrs.atkBase = Format.comma(wAttr.atkBase, 1)
      if (wAttr?.attr?.key) {
        let keyType = {
          mastery: 'comma'
        }
        attrs[wAttr.attr.key] = Format[keyType[wAttr.attr.key] || 'pct'](wAttr.attr.value, 1)
      }
    }
    ret.attrs = attrs
    ret.desc = wData.getAffixDesc(ret.affix)
    return ret
  }

  // 设置天赋
  setTalent (ds = false, mode = 'original', updateTime = '') {
    if (!this.char) {
      return false
    }
    const now = this._now || (new Date()) * 1
    if (ds) {
      let ret = this.char.getAvatarTalent(ds, this.cons, mode)
      if (ret) {
        this.talent = ret || this.talent
        // 设置天赋更新时间
        this._talent = ds._talent || this._talent || ds._time || now
      }
    }
    if (updateTime) {
      this._talent = now
    }
  }

  getProfile () {
    if (!this.isProfile) {
      return false
    }
    return this
  }

  // 判断当前profileData是否具备有效圣遗物信息
  hasArtis () {
    return this.isProfile && this.artis.length > 0
  }

  // 获取数据详情
  getDetail (keys = '') {
    let imgs = this.char.getImgs(this.costume)
    if (this.isGs) {
      return {
        ...(this.getData(keys || 'id,name,level,star,cons,fetter,elem,abbr,weapon,talent,artisSet') || {}),
        ...Data.getData(imgs, 'face,qFace,side,gacha')
      }
    } else {
      return {
        ...(this.getData(keys || 'id,name,level,star,cons,elem,abbr,weapon,talent,artisSet,trees') || {}),
        ...Data.getData(imgs, 'face,qFace,gacha,preview')
      }
    }
  }

  setAvatarBase (ds, source = '') {
    this._now = new Date() * 1
    this.setBasic(ds, source)
    ds.weapon && this.setWeapon(ds.weapon)
    ds.talent && this.setTalent(ds.talent, 'original', source)
    let artis = ds.mysArtis || ds.artis
    // 只要具备圣遗物信息，就更新mysArtis
    this._mysArtis.setArtisData(artis)
    delete this._now
  }

  setAvatar (ds, source = '') {
    this.setAvatarBase(ds, source)
    if (ds.artis && source !== 'mys') {
      this._artis.setArtisData(ds.artis)
    }
    this.calcAttr()
  }

  calcAttr () {
    if (!this.isProfile) {
      return false
    }
    let attr = this._attr = this._attr || Attr.create(this)
    this.attr = attr.calc()
    if (this.game === 'gs') {
      let artisMain = this.artis?.artis['4']?.main || {}
      for (let key of ['pyro', 'hydro', 'electro', 'cryo']) 
        if (artisMain.key === key)
          this.attr[key] = artisMain.value
        else      
          this.attr[key] = 0
      if (artisMain.key === 'anemo')
        for (let key of ['pyro', 'hydro', 'electro', 'cryo'])
          this.attr[key] = -artisMain.value
    }
    this.base = attr.getBase()
  }

  getArtis (isMysArtis = false) {
    return isMysArtis ? this._mysArtis : this._artis
  }

  setArtis (ds = {}, isMysArtis = false) {
    let artis = this.getArtis(isMysArtis)
    artis.setArtisData(ds)
    if (!this._mysArtis.hasArtis) {
      this.setArtis(ds, true)
    }
  }

  // 获取当前profileData的圣遗物评分，withDetail=false仅返回简略信息
  getArtisMark (withDetail = true) {
    return ArtisMark.getMarkDetail(this, withDetail)
  }

  // 计算当前profileData的伤害信息
  async calcDmg ({ enemyLv = 103, mode = 'profile', dmgIdx = 0, idxIsInput = false }) {
    if (!this.dmg || this.dmg._update !== this._update) {
      let ds = this.getData('id,level,elem,attr,cons,artis:artis.sets,trees')
      ds.talent = lodash.mapValues(this.talent, 'level')
      ds.weapon = Data.getData(this.weapon, 'name,affix')
      ds._update = this._update
      this.dmg = new ProfileDmg(ds, this.game)
    }
    return await this.dmg.calcData({ enemyLv, mode, dmgIdx, idxIsInput })
  }

  // toJSON 供保存使用
  toJSON () {
    let keys = this.isGs
      ? 'name,id,elem,level,promote,fetter,costume,cons,talent:originalTalent'
      : 'name,id,elem,level,promote,cons,talent:originalTalent,trees'
    let ret = {
      ...this.getData(keys),
      weapon: Data.getData(this.weapon, this.isGs ? 'name,level,promote,affix' : 'id,level,promote,affix')
    }
    let artis = this.artis.toJSON()
    if (!lodash.isEmpty(artis)) {
      ret.artis = artis
    }
    if (!this.mysArtis.isSameArtis(this.artis)) {
      ret.mysArtis = this.mysArtis.toJSON()
    }
    return {
      ...ret,
      ...this.getData('_source,_time,_update,_talent')
    }
  }

  getArtisDetail (mysArtis = false) {
    return (mysArtis ? this.mysArtis : this.artis).getDetail()
  }

  getMaterials () {
    return MysAvatar.getMaterials(this)
  }
}
