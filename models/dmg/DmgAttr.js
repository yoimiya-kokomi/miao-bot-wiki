/*
* 伤害计算 - 属性计算
* */
import { eleBaseDmg } from './DmgCalcMeta.js'
import lodash from 'lodash'
import DmgMastery from './DmgMastery.js'
import { Format, Meta } from '#miao'
import AttrItem from './AttrItem.js'

let DmgAttr = {
  // 计算并返回指定属性值
  getAttrValue (ds = {}) {
    return (ds.base || 0) + (ds.plus || 0) + ((ds.base || 0) * (ds.pct || 0) / 100)
  },

  // 获取profile对应attr属性值
  getAttr ({ originalAttr, attr, weapon, char, game = 'gs' }) {
    let ret = {}

    if (originalAttr) {
      ret = lodash.merge({}, originalAttr)
    }

    // 基础属性
    lodash.forEach('atk,def,hp'.split(','), (key) => {
      ret[key] = AttrItem.create(originalAttr?.[key] || {
        base: attr[`${key}Base`] * 1 || 0,
        plus: attr[key] * 1 - attr[`${key}Base`] * 1 || 0,
        pct: 0
      })
    })

    lodash.forEach((game === 'gs' ? 'mastery,recharge,cpct,cdmg,heal,dmg,phy' : 'speed,recharge,cpct,cdmg,heal,dmg,enemydmg,effPct,effDef,stance').split(','), (key) => {
      ret[key] = AttrItem.create(originalAttr?.[key] || {
        base: attr[key] * 1 || 0, // 基础值
        plus: 0, // 加成值
        pct: 0, // 百分比加成
        inc: 0 // 提高：护盾增效&治疗增效
      })
    })

    // 技能属性记录
    lodash.forEach((game === 'gs' ? 'a,a2,a3,e,q,nightsoul' : 'a,a2,a3,e,e2,q,q2,t,dot,break').split(','), (key) => {
      ret[key] = ret[key] || {
        pct: 0, // 倍率加成
        multi: 0, // 独立倍率乘区加成，宵宫E等

        plus: 0, // 伤害值提高
        dmg: 0, // 伤害提高
        enemydmg: 0, // 承受伤害提高
        cpct: 0, // 暴击提高
        cdmg: 0, // 爆伤提高

        def: 0, // 防御降低
        ignore: 0 // 无视防御
      }
    })

    if (game === 'gs') 
      lodash.forEach('pyro,hydro,electro,cryo'.split(','), (key) => {
        ret[key] = ret[key] || {
          pct: 0, // 倍率加成
          multi: 0, // 独立倍率乘区加成，宵宫E等
  
          plus: 0, // 伤害值提高
          dmg: attr[key] || 0, // 伤害提高
          enemydmg: 0, // 承受伤害提高
          cpct: 0, // 暴击提高
          cdmg: 0, // 爆伤提高
  
          def: 0, // 防御降低
          ignore: 0 // 无视防御
        }
    })

    ret.enemy = ret.enemy || {
      def: 0, // 降低防御
      ignore: 0, // 无视防御
      phy: 0 // 物理防御
    }

    ret.shield = AttrItem.create(originalAttr?.shield || {
      base: 100, // 基础
      plus: 0, // 护盾强效
      inc: 100 // 吸收倍率
    })

    if (!originalAttr) {
      ret.weapon = weapon // 武器
      ret.weaponTypeName = char.weaponTypeName // 武器类型
      ret.element = Format.elemName(char.elem) // 元素类型
      ret.refine = ((weapon.affix || ret.refine || 1) * 1 - 1) || 0 // 武器精炼
      ret.multi = 0 // 倍率独立乘区
      ret.kx = 0 // 敌人抗性降低
      if (game === 'gs') {
        ret.vaporize = 0 // 蒸发
        ret.melt = 0 // 融化
        ret.burning = 0 // 燃烧
        ret.crystallize = 0 // 结晶
        ret.superConduct = 0 // 超导
        ret.swirl = 0 // 扩散
        ret.electroCharged = 0 // 感电
        ret.shatter = 0 // 碎冰
        ret.overloaded = 0 // 超载
        ret.bloom = 0 // 绽放
        ret.burgeon = 0 // 烈绽放
        ret.hyperBloom = 0 // 超绽放
        ret.aggravate = 0 // 超激化
        ret.spread = 0 // 蔓激化
        ret.fykx = 0 // 敌人反应抗性降低
      } else if (game === 'sr') {
        ret.sp = char.sp * 1
        // 超击破
        ret.superBreak = {
          ignore: 0 // 无视防御
        }
      }
    }
    return ret
  },

  // 获取数据集
  getDs (attr, meta, params) {
    return {
      ...meta,
      attr,
      params,
      refine: attr.refine,
      weaponTypeName: attr.weaponTypeName,
      element: Format.elemName(attr.element) || attr.element, // 计算属性
      calc: DmgAttr.getAttrValue
    }
  },

  // 计算属性
  calcAttr ({ originalAttr, buffs, meta, artis, params = {}, incAttr = '', reduceAttr = '', talent = '', game = 'gs' }) {
    let attr = DmgAttr.getAttr({ originalAttr, game })
    let msg = []
    let { attrMap } = Meta.getMeta(game, 'arti')

    if (incAttr && attrMap[incAttr]) {
      let aCfg = attrMap[incAttr]
      attr[incAttr][aCfg.calc] += aCfg.value
    }
    if (reduceAttr && attrMap[reduceAttr]) {
      let aCfg = attrMap[reduceAttr]
      attr[reduceAttr][aCfg.calc] -= aCfg.value
    }
    
    lodash.forEach(buffs, (buff) => {
      meta.mastery = meta.mastery || buff.mastery // 先反应
    })
    lodash.forEach(buffs, (buff) => {
      let ds = DmgAttr.getDs(attr, meta, params)

      ds.currentTalent = talent
      ds.artis = artis

      if (buff.isStatic) {
        return
      }
      // 如果存在rule，则进行计算
      if (buff.check && !buff.check(ds)) {
        return
      }
      if (buff.cons) {
        if (ds.cons * 1 < buff.cons * 1) {
          return
        }
      }
      if (!lodash.isUndefined(buff.maxCons)) {
        if (ds.cons * 1 > buff.maxCons * 1) {
          return
        }
      }
      if (buff.tree) {
        if (!ds.trees[`10${buff.tree}`]) {
          return
        }
      }

      let title = buff.title

      if (buff.mastery) {
        let mKey = {
          vaporize: '蒸发', melt: '融化', swirl: '扩散'
        }
        let mKey2 = {
          aggravate: '超激化', spread: '蔓激化'
        }

        let mastery = Math.max(0, attr.mastery.base + attr.mastery.plus)
        buff.data = buff.data || {}

        let key = buff.mastery
        if (mKey[key]) {
          buff.data['_' + key] = DmgMastery.getMultiple(key, mastery) * 100
        } else if (mKey2[key]) {
          let eleNum = DmgMastery.getBasePct(key, attr.element)
          let eleBase = 1 + attr[key] / 100 + DmgMastery.getMultiple(key, mastery)
          eleBase *= eleBaseDmg[ds.level]
          buff.data['_' + key] = DmgMastery.getMultiple(key, mastery) * 100
          buff.data['_' + key + 'num'] = eleNum * eleBase
        }
      }

      lodash.forEach(buff.data, (val, key) => {
        if (lodash.isFunction(val)) {
          val = val(ds)
        }
        if (!val && val !== 0) {
          return
        }

        title = title.replace(`[${key}]`, Format.comma(val, 1))

        // 技能提高
        let tRet = /^(a|a2|a3|e|q|t|dot|break|pyro|electro|cryo|hydro)(Def|Ignore|Dmg|Enemydmg|Plus|Pct|Cpct|Cdmg|Multi)$/.exec(key)
        if (tRet) {
          attr[tRet[1]][tRet[2].toLowerCase()] += val * 1 || 0
          return
        }
        let aRet = /^(hp|def|atk|mastery|cpct|cdmg|heal|recharge|dmg|enemydmg|phy|shield|speed|stance)(Plus|Pct|Inc)?$/.exec(key)
        if (aRet) {
          attr[aRet[1]][aRet[2] ? aRet[2].toLowerCase() : 'plus'] += val * 1 || 0
          return
        }
        if (key === 'enemyDef') {
          attr.enemy.def += val * 1 || 0
          return
        }
        if (key === 'ignore' || key === 'enemyIgnore') {
          attr.enemy.ignore += val * 1 || 0
          return
        }

        if (['vaporize', 'melt', 'crystallize', 'burning', 'superConduct', 'swirl', 'electroCharged', 'shatter', 'overloaded', 'bloom', 'burgeon', 'hyperBloom', 'aggravate', 'spread', 'kx', 'fykx', 'multi'].includes(key)) {
          attr[key] += val * 1 || 0
          return
        }

        let sRet = /^(superBreak)(Ignore)$/.exec(key)
        if (sRet) {
          attr[sRet[1]][sRet[2].toLowerCase()] += val * 1 || 0
        }
      })
      msg.push(title)
    })

    return {
      attr, msg
    }
  }
}
export default DmgAttr
