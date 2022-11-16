/*
* 胡桃数据库的统计
*
* */
import lodash from 'lodash'
import { Cfg, Common, App, Data } from '../components/index.js'
import { Abyss, AvatarList, Character, MysApi } from '../models/index.js'
import HutaoApi from './stat/HutaoApi.js'

let app = App.init({
  id: 'stat',
  name: '深渊统计'
})

app.reg('cons-stat', consStat, {
  rule: /^#(喵喵)?角色(持有|持有率|命座|命之座|.命)(分布|统计|持有|持有率)?$/,
  desc: '【#统计】 #角色持有率 #角色5命统计'
})
app.reg('abyss-pct', abyssPct, {
  rule: /^#(喵喵)?深渊(第?.{1,2}层)?(角色)?(出场|使用)(率|统计)*$/,
  desc: '【#统计】 #深渊出场率 #深渊12层出场率'
})
app.reg('abyss-team', abyssTeam, {
  rule: /#深渊(组队|配队)/,
  describe: '【#角色】 #深渊组队'
})
app.reg('upload-data', uploadData, {
  rule: /^#*(喵喵|上传|本期)*(深渊|深境|深境螺旋)[ |0-9]*(数据)?$/,
  desc: '上传深渊'
})
export default app

async function consStat (e) {
  let consData = await HutaoApi.getCons()
  let overview = await HutaoApi.getOverview()

  if (!consData) {
    e.reply('角色持有数据获取失败，请稍后重试~')
    return true
  }

  let msg = e.msg

  let mode = /持有/.test(msg) ? 'char' : 'cons'

  let conNum = -1
  if (mode === 'cons') {
    lodash.forEach([/0|零/, /1|一/, /2|二/, /3|三/, /4|四/, /5|五/, /6|六|满/], (reg, idx) => {
      if (reg.test(msg)) {
        conNum = idx
        return false
      }
    })
  }

  if (!consData && !consData.data) {
    return true
  }

  let data = consData.data

  let Lumine = lodash.filter(data, (ds) => ds.avatar === 10000007)[0] || {}
  let Aether = lodash.filter(data, (ds) => ds.avatar === 10000005)[0] || {}

  Lumine.holdingRate = (1 - Aether.holdingRate) || Lumine.holdingRate

  let ret = []

  lodash.forEach(data, (ds) => {
    let char = Character.get(ds.avatar)

    let data = {
      name: char.name || ds.avatar,
      abbr: char.abbr,
      star: char.star || 3,
      side: char.side,
      hold: ds.holdingRate
    }

    if (mode === 'char') {
      data.cons = lodash.map(ds.rate, (c) => {
        c.value = c.value * ds.holdingRate
        return c
      })
    } else {
      data.cons = ds.rate
    }
    data.cons = lodash.sortBy(data.cons, ['id'])

    ret.push(data)
  })

  if (conNum > -1) {
    ret = lodash.sortBy(ret, [`cons[${conNum}].value`])
    ret.reverse()
  } else {
    ret = lodash.sortBy(ret, ['hold'])
  }
  // 渲染图像
  return await Common.render('stat/character', {
    chars: ret,
    mode,
    conNum,
    totalCount: overview?.data?.totalPlayerCount || 0,
    lastUpdate: consData.lastUpdate,
    pct: function (num) {
      return (num * 100).toFixed(2)
    }
  }, { e, scale: 1.5 })
}

async function abyssPct (e) {
  let mode = /使用/.test(e.msg) ? 'use' : 'pct'
  let modeName
  let abyssData
  let modeMulti = 1

  if (mode === 'use') {
    modeName = '使用率'
    abyssData = await HutaoApi.getAbyssUse()
  } else {
    modeName = '出场率'
    abyssData = await HutaoApi.getAbyssPct()
    modeMulti = 8
  }
  let overview = await HutaoApi.getOverview()

  if (!abyssData) {
    e.reply(`深渊${modeName}数据获取失败，请稍后重试~`)
    return true
  }

  let ret = []
  let chooseFloor = -1
  let msg = e.msg

  const floorName = {
    12: '十二层',
    11: '十一层',
    10: '十层',
    9: '九层'
  }

  // 匹配深渊楼层信息
  lodash.forEach(floorName, (cn, num) => {
    let reg = new RegExp(`${cn}|${num}`)
    if (reg.test(msg)) {
      chooseFloor = num
      return false
    }
  })

  let data = abyssData.data
  data = lodash.sortBy(data, 'floor')
  data = data.reverse()

  lodash.forEach(data, (floorData) => {
    let avatars = []
    lodash.forEach(floorData.avatarUsage, (ds) => {
      let char = Character.get(ds.id)
      if (char) {
        avatars.push({
          name: char.name,
          star: char.star,
          value: ds.value * modeMulti,
          face: char.face
        })
      }
    })
    avatars = lodash.sortBy(avatars, 'value', ['asc'])
    avatars.reverse()
    if (chooseFloor === -1) {
      avatars = avatars.slice(0, 14)
    }

    ret.push({
      floor: floorData.floor,
      avatars
    })
  })

  return await Common.render('stat/abyss-pct', {
    abyss: ret,
    floorName,
    chooseFloor,
    mode,
    modeName,
    totalCount: overview?.data?.collectedPlayerCount || 0,
    lastUpdate: abyssData.lastUpdate
  }, { e, scale: 1.5 })
}

async function abyssTeam (e) {
  let mys = await MysApi.init(e, 'cookie')
  if (!mys || !mys.uid || !mys.isSelfCookie) {
    return true
  }

  let abyssData = await HutaoApi.getAbyssTeam()
  if (!abyssData || !abyssData.data) {
    e.reply('深渊组队数据获取失败，请稍后重试~')
    return true
  }
  abyssData = abyssData.data
  let avatars
  try {
    avatars = await AvatarList.getAll(e, mys)
    // resDetail = await mys.getCharacter()
    if (!avatars) {
      e.reply('角色信息获取失败')
      return true
    }
  } catch (err) {
    // console.log(err);
  }
  let avatarData = await avatars.getTalentData()
  let avatarRet = {}
  let data = {}
  let noAvatar = {}
  lodash.forEach(avatarData, (avatar) => {
    let t = avatar.talent
    avatarRet[avatar.id] = Math.min(avatar.level, avatar.weapon?.level || 1) * 100 + Math.max(t.a?.original, t.e?.original, t.q?.original) * 1000
  })

  let getTeamCfg = (str) => {
    let teams = str.split(',')
    teams.sort()
    let teamMark = 0
    lodash.forEach(teams, (a) => {
      if (!avatarRet[a]) {
        teamMark = -1
        noAvatar[a] = true
      }
      if (teamMark !== -1) {
        teamMark += avatarRet[a] * 1
      }
    })
    if (teamMark === -1) {
      teamMark = 1
    }
    return {
      key: teams.join(','),
      mark: teamMark
    }
  }

  let hasSame = function (team1, team2) {
    for (let idx = 0; idx < team1.length; idx++) {
      if (team2.includes(team1[idx])) {
        return true
      }
    }
    return false
  }

  lodash.forEach(abyssData, (ds) => {
    let floor = ds.floor
    if (!data[floor]) {
      data[floor] = {
        up: {},
        down: {},
        teams: []
      }
    }
    lodash.forEach(['up', 'down'], (halfKey) => {
      lodash.forEach(ds[halfKey], (ds) => {
        let teamCfg = getTeamCfg(ds.item)
        if (teamCfg) {
          if (!data[floor][halfKey][teamCfg.key]) {
            data[floor][halfKey][teamCfg.key] = {
              count: 0,
              mark: 0,
              hasTeam: teamCfg.mark > 1
            }
          }
          data[floor][halfKey][teamCfg.key].count += ds.rate
          data[floor][halfKey][teamCfg.key].mark += ds.rate * teamCfg.mark
        }
      })
    })

    let temp = []
    lodash.forEach(['up', 'down'], (halfKey) => {
      lodash.forEach(data[floor][halfKey], (ds, team) => {
        temp.push({
          team,
          teamArr: team.split(','),
          half: halfKey,
          count: ds.count,
          mark: ds.mark,
          mark2: 1,
          hasTeam: ds.hasTeam
        })
      })
      temp = lodash.sortBy(temp, 'mark')
      data[floor].teams = temp.reverse()
    })
  })

  let ret = {}

  lodash.forEach(data, (floorData, floor) => {
    ret[floor] = {}
    let ds = ret[floor]
    lodash.forEach(floorData.teams, (t1) => {
      if (t1.mark2 <= 0) {
        return true
      }
      lodash.forEach(floorData.teams, (t2) => {
        if (t1.mark2 <= 0) {
          return true
        }
        if (t1.half === t2.half || t2.mark2 <= 0) {
          return true
        }

        let teamKey = t1.half === 'up' ? (t1.team + '+' + t2.team) : (t2.team + '+' + t1.team)
        if (ds[teamKey]) {
          return true
        }
        if (hasSame(t1.teamArr, t2.teamArr)) {
          return true
        }

        ds[teamKey] = {
          up: t1.half === 'up' ? t1 : t2,
          down: t1.half === 'up' ? t2 : t1,
          count: Math.min(t1.count, t2.count),
          mark: t1.hasTeam && t2.hasTeam ? t1.mark + t2.mark : t1.count + t2.count // 如果不存在组队则进行评分惩罚
        }
        t1.mark2--
        t2.mark2--
        return false
      })
      if (lodash.keys(ds).length >= 20) {
        return false
      }
    })
  })

  lodash.forEach(ret, (ds, floor) => {
    ds = lodash.sortBy(lodash.values(ds), 'mark')
    ds = ds.reverse()
    ds = ds.slice(0, 4)

    lodash.forEach(ds, (team) => {
      team.up.teamArr = Character.sortIds(team.up.teamArr)
      team.down.teamArr = Character.sortIds(team.down.teamArr)
    })

    ret[floor] = ds
  })

  let avatarMap = {}

  lodash.forEach(avatarData, (ds) => {
    let char = Character.get(ds.id)
    avatarMap[ds.id] = {
      id: ds.id,
      name: ds.name,
      star: ds.star,
      level: ds.level,
      cons: ds.cons,
      face: char.face
    }
  })

  lodash.forEach(noAvatar, (d, id) => {
    let char = Character.get(id)
    avatarMap[id] = {
      id,
      name: char.name,
      face: char.face,
      star: char.star,
      level: 0,
      cons: 0
    }
  })

  return await Common.render('stat/abyss-team', {
    teams: ret,
    avatars: avatarMap
  }, { e, scale: 1.5 })
}

async function uploadData (e) {
  let isMatch = /^#(喵喵|上传)深渊(数据)?$/.test(e.original_msg || e.msg || '')
  if (!Cfg.get('uploadAbyssData', false) && !isMatch) {
    return false
  }
  let mys = await MysApi.init(e, { auth: 'all' })
  if (!mys || !mys.uid) {
    if (isMatch) {
      e.reply(`请绑定ck后再使用${e.original_msg || e.msg}`)
    }
    return false
  }
  let ret = {}
  let uid = mys.uid
  let resDetail, resAbyss
  try {
    resAbyss = await mys.getSpiralAbyss(1)
    let lvs = Data.getVal(resAbyss, 'floors.0.levels.0')
    // 检查是否查询到了深渊信息
    if (!lvs || !lvs.battles) {
      e.reply('暂未获得本期深渊挑战数据...')
      return true
    } else if (lvs && lvs.battles && lvs.battles.length === 0) {
      if (!mys.isSelfCookie) {
        if (isMatch) {
          e.reply(`请绑定ck后再使用${e.original_msg || e.msg}`)
        }
        return false
      }
    }
    if (resAbyss.floors.length > 0 && !await AvatarList.hasTalentCache(uid)) {
      e.reply('正在获取用户信息，请稍候...')
    }
    resDetail = await mys.getCharacter()
    if (!resDetail || !resAbyss || !resDetail.avatars || resDetail.avatars.length <= 3) {
      e.reply('角色信息获取失败')
      return true
    }
    delete resDetail._res
    delete resAbyss._res
    ret = await HutaoApi.uploadData({
      uid,
      resDetail,
      resAbyss
    })
  } catch (err) {
    // console.log(err);
  }
  if (ret && ret.retcode === 0) {
    let stat = []
    if (ret.data) {
      if (resAbyss.floors.length === 0) {
        e.reply('暂未获得本期深渊挑战数据...')
        return true
      }
      let abyss = new Abyss(resAbyss)
      let abyssData = abyss.getData()
      let avatars = new AvatarList(uid, resDetail.avatars)
      let avatarIds = abyss.getAvatars()
      let overview = ret.info || (await HutaoApi.getOverview())?.data || {}
      let addMsg = function (title, ds) {
        let tmp = {}
        if (!ds) {
          return false
        }
        if (!ds.avatarId && !ds.id) {
          return false
        }
        let char = Character.get(ds.avatarId || ds.id)
        tmp.title = title
        tmp.id = char.id
        tmp.value = `${(ds.value / 10000).toFixed(1)} W`
        let msg = []
        tmp.msg = msg
        let pct = (percent, name) => {
          if (percent < 0.2) {
            msg.push({
              title: '少于',
              value: (Math.max(0.1, 100 - percent * 100)).toFixed(1),
              name: name
            })
          } else {
            msg.push({
              title: '超过',
              value: (Math.min(99.9, percent * 100)).toFixed(1),
              name: name
            })
          }
        }
        if (ds.percent) {
          pct(ds.percent, char.name)
          pct(ds.percentTotal, '总记录')
        } else {
          msg.push({
            txt: '暂无统计信息'
          })
        }
        stat.push(tmp)
      }
      addMsg('最强一击', ret.data?.damage || abyssData?.stat?.dmg || {})
      addMsg('最高承伤', ret.data?.takeDamage || abyssData?.stat.takeDmg || {})
      let avatarData = await avatars.getTalentData(avatarIds, mys)
      return await Common.render('stat/abyss-summary', {
        abyss: abyssData,
        avatars: avatarData,
        stat,
        save_id: uid,
        totalCount: overview?.collectedPlayerCount || 0,
        uid
      }, { e, scale: 1.8 })
    } else {
      e.reply('暂未获得本期深渊挑战数据...')
      return true
    }
  } else {
    e.reply(`${ret.message || '上传失败'}，请稍后重试...`)
  }
  return true
}
