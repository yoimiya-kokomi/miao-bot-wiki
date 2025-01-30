export const details = [{
  title: 'E宿灵球伤害',
  dmg: ({ talent }, dmg) => dmg(talent.e['宿灵球伤害'], 'e,nightsoul')
},{
  title: 'Q秘仪伤害',
  dmg: ({ talent }, dmg) => dmg(talent.q['秘仪伤害'], 'q,nightsoul')
},{
  title: 'Q音波碰撞伤害',
  dmg: ({ talent }, dmg) => dmg(talent.q['音波碰撞伤害'], 'q,nightsoul')
},{
  title: '天赋「显象超感」伤害',
  params: { Hypersense: true },
  dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 160 / 100, 'nightsoul')
},{
  title: '感电反应伤害',
  dmgKey: 'r',
  dmg: ({}, { reaction }) => reaction('electroCharged')
}]

export const defParams = { Nightsoul: true }
export const defDmgIdx = 0
export const mainAttr = 'atk,cpct,cdmg,mastery'

export const buffs = [{
  check: ({ params }) => params.Hypersense === true,
  title: '欧洛伦1命：宿灵球命中敌人后，天赋「显象超感」造成的伤害提升[dmg]%',
  cons: 1,
  data: {
    dmg: 50
  }
},{
  title: '欧洛伦2命：施放元素爆发后，根据命中敌人的个数，最高可获得[dmg]%雷元素伤害加成',
  cons: 2,
  data: {
    dmg: 40
  }
},{
  title: '欧洛伦6命：触发固有天赋「显象超感」后，使当前场上角色的攻击力最高提升[atkPct]%',
  cons: 6,
  data: {
    atkPct: 30
  }
}]

export const createdBy = '冰翼'
