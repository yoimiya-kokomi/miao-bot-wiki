import lodash from 'lodash'
import moment from 'moment'
import { Data } from '#miao'
import { chestInfo } from '../../resources/meta-gs/info/index.js'
import AvatarUtil from './AvatarUtil.js'

const MysAvatar = {
  // 检查更新force值
  checkForce (player, force) {
    let e = player?.e
    let mys = e?._mys
    if (!e || !mys || !mys.isSelfCookie) {
      return force
    }
    let ck = mys?.ckInfo?.ck
    if (!ck || player._ck === ck) {
      return force
    }
    return force
  },
  /**
   * 更新米游社角色信息
   * @param player
   * @param force
   * @returns {Promise<boolean>}
   */
  async refreshMysDetail (player, force = 0) {
    let e = player.e || {}
    let mys = e?._mys
    if (!mys) {
      return false
    }
    if (!AvatarUtil.needRefresh(player._mys, force, { 0: 60, 1: 2, 2: 0 })) {
      return false
    }
    let charData = await mys.getCharacter()
    MysAvatar.setMysCharData(player, charData)
  },

  /**
   * 更新米游社统计信息
   * @param player
   * @param force
   * @returns {Promise<boolean>}
   */
  async refreshMysInfo (player, force = 0) {
    let mys = player?.e?._mys
    if (!mys) {
      return false
    } // 不必要更新
    if (!AvatarUtil.needRefresh(player._info, force, { 0: 60, 1: 2, 2: 0 })) {
      return false
    }
    let infoData = await mys.getIndex()
    if (!infoData || !infoData.role) {
      return false
    }
    MysAvatar.setMysInfo(player, infoData)
  },

  /**
   * 根据已有Mys CharData更新player
   * @param player
   * @param charData
   */
  setMysCharData (player, charData) {
    if (charData && charData.avatars) {
      let role = charData.role || {}
      player.setBasicData({
        level: role.level,
        name: role.nickname
      })
      let charIds = {}
      lodash.forEach(charData.avatars, (ds) => {
        let avatar = Data.getData(ds, 'id,level,cons:actived_constellation_num,fetter')
        avatar.elem = ds.element.toLowerCase()
        // 处理时装数据
        let costume = (ds?.costumes || [])[0]
        if (costume && costume.id) {
          avatar.costume = costume.id
        }
        avatar.weapon = Data.getData(ds.weapon, 'name,star:rarity,level,promote:promote_level,affix:affix_level')
        // 处理圣遗物数据
        let artis = {}
        lodash.forEach(ds.reliquaries, (re) => {
          const posIdx = { 生之花: 1, 死之羽: 2, 时之沙: 3, 空之杯: 4, 理之冠: 5 }
          if (re && re.name && posIdx[re.pos_name]) {
            artis[posIdx[re.pos_name]] = {
              name: re.name,
              level: re.level
            }
          }
        })
        avatar.artis = artis
        player.setAvatar(avatar, 'mys')
        charIds[avatar.id] = true
      })
      // 若角色数据>8，则说明为带ck更新
      // 检查缓存，删除错误缓存的数据
      if (lodash.keys(charIds).length > 8) {
        player.forEachAvatar((avatar) => {
          if (!charIds[avatar.id] && !avatar.isProfile) {
            player.delAvatar(avatar.id)
          }
        })
      }
    }
    if (player.hasAvatar()) {
      player._mys = new Date() * 1
      player.save()
    }
  },

  setMysInfo (player, infoData) {
    let role = infoData.role
    // 设置角色信息
    let homeLevel = ((infoData?.homes || [])[0])?.level
    if (role) {
      player.setBasicData({
        level: role.level,
        name: role.nickname
      })
    }
    // 设置角色数据
    lodash.forEach(infoData?.avatars || [], (ds) => {
      let avatar = Data.getData(ds, 'id,level,cons:actived_constellation_num,fetter')
      avatar.elem = ds.element.toLowerCase()
      player.setAvatar(avatar, 'mys')
    })
    let stats = {}
    lodash.forEach(infoData?.stats || [], (num, key) => {
      key = key.replace('_number', '')
      if (key !== 'spiral_abyss') {
        stats[lodash.camelCase(key)] = num
      }
    })
    if (stats?.fieldExtMap) {
      delete stats.fieldExtMap
    }
    let exploration = {}
    lodash.forEach(infoData?.world_explorations || [], (ds) => {
      let { name } = ds
      if (name === '层岩巨渊') {
        return true
      }
      exploration[name === '层岩巨渊·地下矿区' ? '层岩巨渊' : name] = ds.exploration_percentage
    })
    player.info = {
      homeLevel,
      stats,
      exploration
    }

    player._info = new Date() * 1
    player.save()
  },

  /**
   * 获取当前角色需要更新天赋的角色ID
   * @param player
   * @param ids 角色列表，若传入则查询指定角色列表，不传入查询全部
   * @param force
   * @returns {*[]}
   */
  getNeedRefreshIds (player, ids, force = 0) {
    let ret = []
    if (!ids) {
      ids = player.getAvatarIds()
    } else if (!lodash.isArray(ids)) {
      ids = [ids]
    }
    lodash.forEach(ids, (id) => {
      let avatar = player.getAvatar(id)
      if (!avatar) {
        return true
      }
      let needMap = { 0: avatar.hasTalent ? 60 * 48 : 60 * 3, 1: 60, 2: 0 }
      if (AvatarUtil.needRefresh(avatar._talent, force, needMap)) {
        ret.push(avatar.id)
      }
    })
    return ret
  },

  /**
   * 使用MysApi刷新指定角色的天赋信息
   * @param player
   * @param ids
   * @param force
   * @returns {Promise<number|boolean>}
   */
  async refreshTalent (player, ids, force = 0) {
    let e = player?.e
    let mys = e?._mys
    if (!e || !mys || !mys.isSelfCookie) {
      return false
    }
    force = MysAvatar.checkForce(player, force)
    let needReqIds = MysAvatar.getNeedRefreshIds(player, ids, force)
    let refreshCount = 0
    let failCount = 0
    if (needReqIds.length > 0) {
      if (needReqIds.length > 8) {
        e && e.reply('正在获取角色信息，请稍候...')
      }
      // 并发5，请求天赋数据
      await Data.asyncPool(5, needReqIds, async (id) => {
        let avatar = player.getAvatar(id)
        if (!avatar) {
          return false
        }
        // TODO: 不能直接用 avatar.isMaxTalent 判断
        // 此处的 avatar.promote 还是更新前的
        // e.g. 有人之前 80 级未突破，天赋8 8 8，但是之后 80 突破，天赋9 9 9
        if (failCount > 5) {
          avatar.setTalent(false, 'original', true)
          return false
        }
        let ret = await MysAvatar.refreshAvatarTalent(avatar, mys)
        if (ret === false) {
          failCount++
        } else {
          refreshCount++
        }
      })
    }
    player.save()
    return refreshCount
  },

  async refreshAvatarTalent (avatar, mys) {
    if (mys && mys.isSelfCookie) {
      let char = avatar.char
      if (!char) {
        return false
      }
      let id = char.id
      let talent = {}
      let talentRes = await mys.getDetail(id)
      let game = avatar.game
      if (game === 'gs' && talentRes && talentRes.skill_list) {
        let talentList = lodash.orderBy(talentRes.skill_list, ['id'], ['asc'])
        for (let val of talentList) {
          let { max_level: maxLv, level_current: lv } = val
          if (val.name.includes('普通攻击')) {
            talent.a = lv
            continue
          }
          if (maxLv >= 10 && !talent.e) {
            talent.e = lv
            continue
          }
          if (maxLv >= 10 && !talent.q) {
            talent.q = lv
          }
        }
      } else if (game === 'sr' && talentRes && talentRes.skills) {
        let talentList = lodash.orderBy(talentRes.skills, ['point_id'], ['asc'])
        for (let val of talentList) {
          let { cur_level: lv, anchor } = val
          if (anchor.includes('Point01')) {
            talent.a = lv
            continue
          }
          if (anchor.includes('Point02')) {
            talent.e = lv
            continue
          }
          if (anchor.includes('Point03')) {
            talent.q = lv
            continue
          }
          if (anchor.includes('Point04')) {
            talent.t = lv
            continue
          }
        }
      }
      let ret = char.getAvatarTalent(talent, avatar.cons, 'original')
      avatar.setTalent(ret, 'original', true)
      return !!ret
    }
    return false
  },

  getDate (time) {
    return time ? moment(new Date(time)).format('MM-DD HH:mm') : ''
  },

  getInfo (player) {
    let chestMap = []
    Data.eachStr('common,exquisite,precious,luxurious,magic', (key) => {
      chestMap.push({
        key: `${key}Chest`,
        ...chestInfo[key]
      })
    })
    let ret = {
      ...(player.info || {}),
      chestMap
    }
    let stats = ret.stats || {}
    if (stats?.activeDay) {
      let num = stats?.activeDay
      let year = Math.floor(num / 365)
      let month = Math.floor((num % 365) / 30.41)
      let day = Math.floor((num % 365) % 30.41)
      let msg = ''
      if (year > 0) {
        msg += year + '年'
      }
      if (month > 0) {
        msg += month + '个月'
      }
      if (day > 0) {
        msg += day + '天'
      }
      ret.activeDay = msg
    }
    let avatarCount = 0
    let avatar5Count = 0
    let goldCount = 0
    player.forEachAvatar((avatar) => {
      avatarCount++
      if (avatar.star === 5) {
        avatar5Count++
        if (!avatar.char?.isTraveler) {
          goldCount += (avatar.cons || 0) + 1
        }
      }
      let w = avatar.weapon
      if (w && w.star === 5) {
        goldCount += w.affix * 1
      }
    })
    stats.avatar = Math.max(stats.avatar, avatarCount)
    stats.goldCount = goldCount
    stats.avatar5 = avatar5Count
    ret.stats = stats
    return ret
  },

  getMaterials (avatar) {
    let ret = {}
    let { char } = avatar
    ret.talent = char.getMaterials('talent')
    ret.weekly = char.getMaterials('weekly')
    return ret
  }
}
export default MysAvatar
