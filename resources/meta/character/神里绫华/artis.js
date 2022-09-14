export default function ({ attr, rule, def }) {
  if (attr.mastery > 120) {
    return rule('神里-精通', { atk: 75, cp: 100, cd: 100, mastery: 75, dmg: 100, recharge: 30 })
  }
  return def({ atk: 75, cp: 100, cd: 100, dmg: 100, phy: 100, recharge: 30 })
}