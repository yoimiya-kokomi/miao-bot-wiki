import lodash from 'lodash'
import { autoRefresh, getTargetUid } from './ProfileCommon.js'
import { ProfileRank } from '../../models/index.js'
import { Common, Profile, Data } from '../../components/index.js'

export async function profileList (e) {
  let uid = await getTargetUid(e)
  if (!uid) {
    return true
  }
  let isSelfUid = false
  if (e.runtime) {
    let uids = e.runtime?.user?.ckUids || []
    isSelfUid = uids.join(',').split(',').includes(uid + '')
  }
  let rank = false
  let servName = Profile.getServName(uid)
  let hasNew = false
  let newCount = 0

  let chars = []
  let msg = ''
  let newChar = {}
  if (e.newChar) {
    msg = '获取角色面板数据成功'
    newChar = e.newChar
  }
  const cfg = await Data.importCfg('cfg')
  // 获取面板数据
  let profiles = Profile.getAll(uid)
  // 检测标志位
  await ProfileRank.setUidInfo({ uid, profiles, qq: e.user_id, uidType: isSelfUid ? 'ck' : 'bind' })

  let groupId = e.group_id
  if (groupId) {
    rank = await ProfileRank.create({ groupId, uid, qq: e.user_id })
  }
  const groupRank = rank && (cfg?.diyCfg?.groupRank || false)
  const rankCfg = await ProfileRank.getGroupCfg(groupId)
  await Profile.forEach(uid, async function (profile) {
    if (!profile.hasData) {
      return true
    }
    let char = profile.char
    let tmp = char.getData('id,face,name,abbr,element,star')
    tmp.face = char.getImgs(profile.costume).face
    tmp.source = profile.dataSource
    tmp.level = profile.level || 1
    tmp.cons = profile.cons
    tmp.isNew = 0
    if (newChar[char.name]) {
      tmp.isNew = 1
      newCount++
    }
    if (rank) {
      tmp.groupRank = await rank.getRank(profile, !!tmp.isNew)
    }
    chars.push(tmp)
  })

  if (chars.length === 0) {
    if (await autoRefresh(e)) {
      await profileList(e)
      return true
    } else {
      e.reply('尚未获取任何角色数据')
    }
    return true
  }

  if (newCount > 0) {
    hasNew = newCount <= 8
  }

  chars = lodash.sortBy(chars, ['isNew', 'star', 'level', 'id'])
  chars = chars.reverse()

  // 渲染图像
  return await Common.render('character/profile-list', {
    save_id: uid,
    uid,
    chars,
    servName,
    hasNew,
    msg,
    groupRank,
    allowRank: rank && rank.allowRank,
    rankCfg
  }, { e, scale: 1.6 })
}
