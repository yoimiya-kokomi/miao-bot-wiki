let attr = (key, val) => {
  let data = {}
  data[key] = val
  return {
    isStatic: true,
    data
  }
}
export default {
  云无留迹的过客: {
    2: attr('heal', 10)
  },
  野穗伴行的快枪手: {
    2: attr('atkPct', 12),
    4: [attr('speedPct', 6), {
      title: '普攻伤害提高10%',
      data: {
        aDmg: 10
      }
    }]
  },
  净庭教宗的圣骑士: {
    2: attr('defPct', 15),
    4: {
      title: '护盾强效提高20%',
      data: {
        shield: 20
      }
    }
  },
  密林卧雪的猎人: {
    2: attr('ice', 10),
    4: {
      title: '释放终结技后2回合，爆伤提高25%',
      data: {
        cdmg: 25
      }
    }
  },
  街头出身的拳王: {
    2: attr('phy', 10),
    4: {
      title: '攻击或被攻击5层Buff提高攻击力25%',
      data: {
        atkPct: 25
      }
    }
  },
  熔岩锻铸的火匠: {
    2: attr('fire', 10),
    4: {
      title: '战技造成的伤害提高12%，释放终结技下一次的火属性伤害提高12%',
      data: {
        eDmg: 12,
        dmg: 12 // todo: 检查属性
      }
    }
  },
  繁星璀璨的天才: {
    2: attr('quantum', 10),
    4: {
      title: '对有量子弱点的目标造成伤害时，无视其20%的防御力',
      data: {
        ignore: 20
      }
    }
  },
  激奏雷电的乐队: {
    2: attr('elec', 10),
    4: {
      title: '释放战技时，攻击力提高20%',
      data: {
        atkPct: 20
      }
    }
  },
  晨昏交界的翔鹰: {
    2: attr('wind', 10)
  },
  流星追迹的怪盗: {
    2: attr('stance', 16),
    4: attr('stance', 16)
  },
  盗匪荒漠的废土客: {
    2: attr('imaginary', 10),
    4: {
      title: '对陷入负面效果的目标的暴击率提高10%，对禁锢状态的目标暴击率提高20%',
      data: {
        cpct: 10
      }
    }
  },
  宝命长存的莳者: {
    2: attr('hpPct', 12),
    4: {
      title: '消耗生命2层提高暴击率16%',
      data: {
        cpct: 16
      }
    }
  },
  骇域漫游的信使: {
    2: attr('speedPct', 6),
    4: {
      title: '对我方释放终结技时速度提高12%',
      data: {
        speedPct: 12
      }
    }
  },
  太空封印站: {
    2: [attr('atkPct', 12), {
      title: '速度大于等于120提高攻击力12%',
      check: ({ calc, attr }) => calc(attr.speed) > 120,
      data: {
        atkPct: 12
      }
    }]
  },
  不老者的仙舟: {
    2: [attr('hpPct', 12), {
      title: '速度大于等于120提高攻击力8%',
      check: ({ calc, attr }) => calc(attr.speed) > 120,
      data: {
        atkPct: 8
      }
    }]
  },
  泛银河商业公司: {
    2: [attr('effPct', 10), {
      title: '基于效果命中提高攻击力[atkPct]%',
      data: {
        atkPct: ({ calc, attr }) => Math.min(25, calc(attr.effPct) / 4 || 0)
      }
    }]
  },
  筑城者的贝洛伯格: {
    2: [attr('defPct', 15), {
      title: '效果命中大于50%时，提高防御力15%',
      check: ({ calc, attr }) => calc(attr.effPct) > 50,
      data: {
        defPct: 15
      }
    }]
  },
  星体差分机: {
    2: attr('cdmg', 16)
  },
  停转的萨尔索图: {
    2: [attr('cpct', 8), {
      title: '终结技与追加攻击造成的伤害提高15%',
      check: ({ attr, calc }) => {
        return calc(attr.cpct) > 50
      },
      data: {
        qDmg: 15,
        tDmg: 15
      }
    }]
  },
  盗贼公国塔利亚: {
    2: [attr('stance', 16), {
      title: '速度大于145时，击破特攻提高20%',
      check: ({ calc, attr }) => calc(attr.speed) > 145,
      data: {
        stance: 20
      }
    }]
  },
  生命的翁瓦克: {
    2: attr('recharge', 5)
  },
  繁星竞技场: {
    2: [attr('cpct', 8), {
      title: '暴击率大于等于70%时，普攻和战技造成的伤害提高20%',
      check: ({ calc, attr }) => calc(attr.cpct) >= 70,
      data: {
        aDmg: 20,
        eDmg: 20
      }
    }]
  },
  折断的龙骨: {
    2: [attr('effDef', 10), {
      title: '效果抵抗大于等于30%时，暴击伤害提高10%',
      check: ({ calc, attr }) => calc(attr.effDef) >= 30,
      data: {
        cdmg: 10
      }
    }]
  },
  毁烬焚骨的大公: {
    2: {
      title: '追加攻击造成的伤害提高[tDmg]%',
      data: {
        tDmg: 20
      }
    },
    4: {
      title: '计算[_buffCount]层，提高攻击力[atkPct]%',
      data: {
        _buffCount: ({ params }) => params.tArtisBuffCount || 3,
        atkPct: ({ params }) => (params.tArtisBuffCount || 3) * 6
      }
    }
  },
  幽锁深牢的系囚: {
    2: attr('atkPct', 12),
    4: {
      title: '3层持续伤害下无视18%防御力',
      data: {
        ignore: 18
      }
    }
  },
  苍穹战线格拉默: {
    2: [attr('atkPct', 12), {
      title: '装备者速度大于[_speed]时，伤害提高[dmg]%',
      check: ({ attr }) => attr.speed >= 135,
      data: {
        _speed: ({ attr }) => attr.speed < 160 ? 135 : 160,
        dmg: ({ attr }) => attr.speed < 160 ? 12 : 18
      }
    }]
  },
  梦想之地匹诺康尼: {
    2: [attr('recharge', 5), {
      title: '同属性角色伤害提高10%',
      data: {
        dmg: 10
      }
    }]
  },
  死水深潜的先驱: {
    2: {
      title: '对受负面状态影响的敌人造成伤害提高[dmg]%',
      data: {
        dmg: 12
      }
    },
    4: [attr('cpct', 4), {
      title: '对陷入不少于3个负面效果的敌方目标造成的暴击率额外提高[cpct]%，暴击伤害提高[cdmg]%',
      data: {
        cpct: 4,
        cdmg: 24
      }
    }]
  },
  机心戏梦的钟表匠: {
    2: attr('stance', 16),
    4: {
      title: '装备者对我方释放终结技时，我方全体击破特攻提高[stance]%',
      data: {
        stance: 30
      }
    }
  },
  无主荒星茨冈尼亚: {
    2: [attr('cpct', 4), {
      title: '敌方目标被消灭提高暴击伤害，至多提高[cdmg]%',
      data: {
        cdmg: 40
      }
    }]
  },
  出云显世与高天神国: {
    2: [attr('atkPct', 12), {
      title: '存在一名与装备者命途相同的队友时，暴击率提高[cpct]%',
      data: {
        cpct: 12
      }
    }]
  },
  荡除蠹灾的铁骑: {
    2: attr('stance', 16),
    4: [{
      title: '基于击破特攻，造成的击破伤害无视敌方[breakIgnore]%防御',
      sort: 9,
      data: {
        breakIgnore: ({ attr }) => attr.stance >= 150 ? 10 : 0
      }
    }, {
      title: '基于击破特攻，造成的超击破伤害无视敌方[superBreakIgnore]%防御',
      sort: 9,
      data: {
        superBreakIgnore: ({ attr }) => attr.stance >= 250 ? 15 : 0
      }
    }]
  },
  风举云飞的勇烈: {
    2: attr('atkPct', 12),
    4: [attr('cpct', 6), {
      title: '施放追加攻击使终结技伤害提高[qDmg]%',
      data: {
        qDmg: 36
      }
    }]
  },
  奔狼的都蓝王朝: {
    2: {
      title: '5层Buff使得装备者造成的追击伤害提高[tDmg]%，装备者的暴击伤害提高[cdmg]%',
      data: {
        tDmg: 25,
        cdmg: 25
      }
    }
  },
  劫火莲灯铸炼宫: {
    2: [attr('speedPct', 6), {
      title: '击中火弱点的敌方时，击破特攻提高[stance]%',
      data: {
        stance: 40
      }
    }]
  },
  奇想蕉乐园: {
    2: [attr('cdmg', 16), {
      title: '存在装备者召唤的目标时，暴击伤害额外提高[cdmg]%',
      data: {
        cdmg: 32
      }
    }]
  },
  沉陆海域露莎卡: {
    2: attr('recharge', 5)
  },
  重循苦旅的司铎: {
    2: attr('speedPct', 6)
  },
  识海迷坠的学者: {
    2: attr('cpct', 8),
    4: {
      title: '终结技造成的伤害提高[qDmg]%，施放终结技后战技伤害提高[eDmg]%',
      data: {
        eDmg: 45,
        qDmg: 20
      }
    }
  },
  凯歌祝捷的英豪: {
    2: attr('atkPct', 12),
    4: [attr('speedPct', 6), {
      title: '装备者的忆灵攻击时，装备者和忆灵的暴击伤害提高[cdmg]%',
      data: {
        cdmg: 30
      }
    }]
  },
  哀歌覆国的诗人: {
    2: attr('quantum', 10),
    4: [attr('speedPct', -8), {
      title: '装备者速度小于[_speed]时，暴击率提高[cpct]%',
      check: ({ attr }) => attr.speed < 110,
      data: {
        _speed: ({ attr }) => attr.speed < 95 ? 95 : 110,
        cpct: ({ attr }) => attr.speed < 95 ? 32 : 20
      }
    }]
  },
  谧宁拾骨地: {
    2: [attr('hpPct', 12), {
      title: '生命值大于等于5000时暴击伤害提升28%',
      check: ({ calc, attr }) => calc(attr.hp) >= 5000,
      data: {
        cdmg: 28
      }
    }]
  },
  渊思寂虑的巨树: {
    2: [attr('speedPct', 6), {
      title: '速度大于等于[_speed]时，治疗量提高[heal]%',
      check: ({attr }) => attr.speed >= 135,
      data: {
        _speed: ({ attr }) => attr.speed >= 180 ? 135 : 180,
        heal: ({ attr }) => attr.speed >= 180 ? 12 : 20
      }
    }]
  }
}
