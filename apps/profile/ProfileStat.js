import lodash from 'lodash'
import {Cfg, Common, Data } from '../../components/index.js'
import { AvatarList, ProfileRank } from '../../models/index.js'

export async function profileStat (e) {
  let isMatch = /^#(喵喵|面板)练度统计?$/.test(e.original_msg || e.msg || '')
  if (!Cfg.get('profileStat', false) && !isMatch) {
    return false
}
  // 缓存时间，单位小时

  let msg = e.msg.replace('#', '').trim()
  if (msg === '角色统计' || msg === '武器统计') {
    // 暂时避让一下抽卡分析的关键词
    return false
  }

  let avatars = await AvatarList.getAll(e)
  if (!avatars) {
    return true
  }
  let uid = avatars.uid
  let rank = false
  if (e.group_id) {
    rank = await ProfileRank.create({ group: e.group_id, uid, qq: e.user_id })
  }
  let talentData = await avatars.getTalentData()
  // 天赋等级背景
  let avatarRet = []
  lodash.forEach(talentData, (avatar) => {
    let { talent, id } = avatar
    avatar.aeq = talent?.a?.original + talent?.e?.original + talent?.q?.original || 3
    avatarRet.push(avatar)
    let profile = avatars.getProfile(id)
    if (profile) {
      if (profile.hasData) {
        let mark = profile.getArtisMark(false)
        avatar.artisMark = Data.getData(mark, 'mark,markClass,names')
        if (rank) {
          rank.getRank(profile)
        }
      }
    }
  })

  let sortKey = 'level,star,aeq,cons,weapon.level,weapon.star,weapon.affix,fetter'.split(',')
  avatarRet = lodash.orderBy(avatarRet, sortKey)
  avatarRet = avatarRet.reverse()
  let talentNotice = ''
  if (!avatars.isSelfCookie || avatarRet.length <= 8) {
    talentNotice = '未绑定CK，信息可能展示不完全。回复<span>#体力帮助</span>获取CK配置帮助'
  }

  return await Common.render('character/profile-stat', {
    save_id: uid,
    uid,
    talentLvMap: '0,1,1,1,2,2,3,3,3,4,5'.split(','),
    avatars: avatarRet,
    isSelf: e.isSelf,
    talentNotice
  }, { e, scale: 1.8 })
}
