export const details = [{
  title: '刃轮巡猎首段伤害',
  params: { NightsoulStatus: true },
  dmg: ({ talent, attr }, { basic }) => basic(talent.a['刃轮巡猎一段伤害']*  attr.def / 100 , 'a,nightsoul')
},{
  title: '刃轮巡猎尾段伤害',
  params: { NightsoulStatus: true },
  dmg: ({ talent, attr }, { basic }) => basic(talent.a['刃轮巡猎四段伤害']*  attr.def / 100 , 'a,nightsoul')
},{
  title: 'Q技能伤害',
  params: { SourceSamples: true },
  dmg: ({ talent, attr }, { basic }) => basic(talent.q['技能伤害']*  attr.def / 100 , 'q,nightsoul')
},{
  title: 'Q每跳治疗',
  dmg: ({ talent, calc, attr }, { heal }) => heal(talent.q['持续治疗量2'][0] * calc(attr.def) / 100 + talent.q['持续治疗量2'][1] * 1)
},{
  title: 'Q追加节拍伤害',
  params: { SourceSamples: true },
  dmg: ({ talent, attr }, { basic }) => basic(talent.q['追加节拍伤害']*  attr.def / 100 , 'q,nightsoul')
},{
  title: '六命额外治疗量',
  cons: 6,
  dmg: ({ calc, attr }, { heal }) => heal(1.2 * calc(attr.def))
}]

export const defParams = { Nightsoul: true }
export const defDmgIdx = 3
export const mainAttr = 'def,cpct,cdmg,heal'

export const buffs = [{
  check: ({ params }) => params.NightsoulStatus === true,
  title: '希诺宁元素战技：处于夜魂加持状态下时，岩元素「源音采样」将始终保持激活状态，且激活后敌人的岩元素抗性降低',
  data: {
    kx: ({ talent }) => talent.e['元素抗性降低']
  }
},{
  title: '希诺宁天赋：拥有少于两枚经过元素转化的「源音采样」，普通攻击与下落攻击造成的伤害提升[aDmg]%',
  data: {
    aDmg: 30,
    a3Dmg: 30
  }
},{
  title: '希诺宁天赋：队伍中的附近的角色触发「夜魂迸发」时，防御力提升[defPct]%',
  data: {
    defPct: 20
  }
},{
  check: ({ params }) => params.SourceSamples === true,
  title: '希诺宁2命：希诺宁携带的岩元素「源音采样」将始终保持激活状态，且激活后敌人的岩元素抗性降低',
  cons: 2,
  data: {
    kx: ({ talent }) => talent.e['元素抗性降低']
  }
},{
  title: '希诺宁2命：造成的岩元素伤害提升[dmg]%',
  cons: 2,
  data: {
    dmg: 50
  }
},{
  title: '希诺宁4命：施放元素战技后，普通攻击、重击与下落攻击造成的伤害提升[aPlus]',
  cons: 4,
  sort: 9,
  data: {
    aPlus: ({ attr, calc }) => calc(attr.def) * 65 / 100,
    a2Plus: ({ attr, calc }) => calc(attr.def) * 65 / 100,
    a3Plus: ({ attr, calc }) => calc(attr.def) * 65 / 100
  }
},{
  title: '希诺宁6命：处于夜魂加持状态下时，进行冲刺、腾跃、普通攻击、下落攻击时，无视夜魂加持状态下的限制，并提升普通攻击与下落攻击造成的伤害[aPlus] ',
  cons: 6,
  sort: 9,
  data: {
    aPlus: ({ attr, calc }) => calc(attr.def) * 300 / 100,
    a3Plus: ({ attr, calc }) => calc(attr.def) * 300 / 100
  }
}]

export const createdBy = '冰翼'
