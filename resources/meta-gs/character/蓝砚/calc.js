export const details = [{
  title: 'E翦月环伤害',
  dmg: ({ talent }, dmg) => dmg(talent.e['翦月环伤害'], 'e')
},{
  title: '护盾吸收量',
  dmg: ({ talent, calc, attr }, { shield }) => shield((talent.e['护盾吸收量2'][0] * calc(attr.atk) / 100 + talent.e['护盾吸收量2'][1] * 1) * 1)
},{
  title: 'Q技能单段伤害',
  dmg: ({ talent }, dmg) => dmg(talent.q['技能伤害2'][0], 'q')
}]

export const defParams = { Nightsoul: true }
export const defDmgIdx = 1
export const mainAttr = 'atk,cpct,cdmg,mastery'

export const buffs = [{
  title: '蓝砚天赋：元素战技与元素爆发造成的伤害值提升，提升值分别相当于蓝砚元素精通的[ePlus]和[qPlus]。',
  sort: 9,
  data: {
    ePlus: ({ attr, calc }) => calc(attr.mastery) * 309 / 100,
    qPlus: ({ attr, calc }) => calc(attr.mastery) * 774 / 100
  }
},{
  title: '蓝砚4命：施放元素爆发之后元素精通提升[mastery]',
  cons: 4,
  data: {
    mastery: 60
  }
}]

export const createdBy = '冰翼'