/*
* 伤害计算 - Buff计算
* */
import lodash from 'lodash'
import { ArtifactSet, Weapon } from '../index.js'

/*
理论参考：www.miyoushe.com/ys/article/32359316
sort: 各级数值含义及分类规则
1 默认 常规区数值，不涉及二次转化
    基于基础区（基础攻击、防御、生命）的数值提升，e.g. 圣遗物、武器直接的百分比攻击力提升
    固定数值加成，e.g. 万叶二命的200精通加成

#其他属性：指除了元素充能和最大生命值以外的区间
4 基于元素充能的属性转化，e.g. 雷电将军天赋，基于元素充能提升攻击力；薙刀，基于元素充能提升攻击力；绝缘套，基于充能提升q伤害
5 基于最大生命值向元素精通的转化，e.g. 圣显之钥，基于最大生命值提升元素精通
6 基于元素精通向元素充能/其他属性（除了元素精通）的转化，e.g. 西福斯的月光，基于元素精通提升元素充能；赤沙之杖，基于元素精通提升攻击力
    *特例，旅行者战技的20充能加成和心海6命40%水伤加成，这两个虽然是固定数值提升，但是数值在额外区，所以sort放在这里
7 基于其他属性向元素精通的属性转化，e.g. 纳西妲天赋，基于自身元素精通提升在场角色元素精通

9 总计值转化
    基于最大生命值的转化/其他属性的【有限定条件】的向增伤/双爆/伤害值的属性转化， (限定条件：特定技能/召唤物限定
        e.g. 胡桃e，基于最大生命值提升攻击力
          妮露天赋，基于最大生命值提升丰穰之核伤害
          赛诺天赋，基于元素精通提升特定技能伤害；八重天赋，基于元素精通提升e伤害；
          纳西妲Q，基于元素精通提升e双爆
          天空系列武器，基于攻击力造成物理伤害，视作对基础倍率区的直接提升；辰砂之纺锤，基于最大防御力提升e伤害值
        *最大防御力的某些转化也可以算在这里，e.g. 一斗开Q，基于最大防御力提升攻击力
    基于元素精通提升反应伤害，e.g. 蒸发、融化、激化反应的Buff栏展示需要，实际上不影响具体伤害计算
10 最终计算区，直接影响具体伤害乘区，可以视作在dmgCalc.js中，实际上没有sort: 10这种情况
*/
let DmgBuffs = {
  getBuffs (profile, buffs = [], game = 'gs') {
    let weaponBuffs = DmgBuffs.getWeaponBuffs(profile.weapon, game)
    let artisBuffs = DmgBuffs.getArtisBuffs(profile.artis, game)
    buffs = lodash.concat(buffs, weaponBuffs, artisBuffs)
    let mKey = {
      vaporize: '蒸发',
      melt: '融化',
      swirl: '扩散'
    }
    let mKey2 = {
      aggravate: '超激化',
      spread: '蔓激化'
    }
    buffs = lodash.filter(buffs, (b) => !!b)
    lodash.forEach(buffs, (buff, idx) => {
      if (lodash.isString(buff)) {
        if (mKey[buff]) {
          buff = {
            title: `元素精通：${mKey[buff]}伤害提高[_${buff}]%`,
            mastery: buff,
            sort: 9
          }
          buffs[idx] = buff
        } else if (mKey2[buff]) {
          buff = {
            title: `元素精通：${mKey2[buff]}伤害提高[_${buff}]%，造成的伤害值提升[_${buff}num]`,
            mastery: buff,
            sort: 9
          }
          buffs[idx] = buff
        }
      }
      buff.sort = lodash.isUndefined(buff.sort) ? 1 : buff.sort
    })
    buffs = lodash.sortBy(buffs, ['sort'])
    return buffs
  },
  // 圣遗物Buff
  getArtisBuffs (artis = {}, game = 'gs') {
    let retBuffs = []
    const elemMap = { '雷': 'electro', '火': 'pyro', '冰': 'cryo', '水': 'hydro' }
    ArtifactSet.eachSet(artis, (sets, num) => {
      let buffs = ArtifactSet.getArtisSetBuff(sets.name, num, game)
      if (lodash.isPlainObject(buffs)) {
        buffs = [buffs]
      }
      lodash.forEach(buffs, (buff) => {
        if (!buff) return
        if (!buff.isStatic) {
          retBuffs.push({
            ...buff,
            title: `${sets.name}${num}：` + buff.title
          })
        }
        else if (buff.elem in elemMap) {
          let elebuff = lodash.cloneDeep(buff)
          elebuff.data[`${elemMap[buff.elem]}Dmg`] = buff.data.dmg
          delete elebuff.isStatic
          delete elebuff.data.dmg
          delete elebuff.elem
          retBuffs.push({
            ...elebuff,
            title: `${sets.name}${num}：${buff.elem}` + elebuff.title
          })
        }
        else if (game === 'gs' && buff.elem === '风') {
          let elebuff = lodash.cloneDeep(buff)
          elebuff.data.pyroDmg = elebuff.data.hydroDmg = elebuff.data.cryoDmg = elebuff.data.electroDmg = -buff.data.dmg
          delete elebuff.isStatic
          delete elebuff.data.dmg
          delete elebuff.elem
          retBuffs.push({
            ...elebuff,
            title: `${sets.name}${num}：${buff.elem}` + elebuff.title
          })
        }
      })
    })
    return retBuffs
  },

  // 武器Buff
  getWeaponBuffs (wData, game = 'gs') {
    let weapon = Weapon.get(wData.name, game)
    if (!weapon) {
      return false
    }
    let affix = wData.refine || wData.affix
    let weaponCfg = weapon.getWeaponAffixBuffs(affix, false)

    let ret = []
    lodash.forEach(weaponCfg, (ds) => {
      if (ds.isStatic) {
        return true
      }
      ret.push(ds)
    })
    return ret
  }
}
export default DmgBuffs
