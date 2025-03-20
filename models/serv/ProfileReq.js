import { MysApi } from '#miao.models'
import Base from '../Base.js'
import fetch from 'node-fetch'
import lodash from 'lodash'

export default class ProfileReq extends Base {
  constructor (e, game = 'gs') {
    super()
    this.e = e
    this.game = e.game || game
    this.uid = e.uid
  }

  static create (e, game = 'gs') {
    if (!e || !e.uid) {
      return false
    }
    // 预设面板不更新数据
    if (e.uid * 1 < 100000006) {
      return false
    }
    return new ProfileReq(e, e.game || game)
  }

  async setCd (seconds = 60) {
    let ext = new Date() * 1 + seconds * 1000
    await redis.set(`miao:profile-cd:${this.uid}`, ext + '', { EX: seconds })
  }

  async inCd () {
    let ext = await redis.get(`miao:profile-cd:${this.uid}`)
    if (!ext || isNaN(ext)) {
      return false
    }
    let cd = (new Date() * 1) - ext
    if (cd < 0 && Math.abs(cd) < 100 * 60 * 1000) {
      return Math.ceil(0 - cd / 1000)
    }
    return false
  }

  err (msg = '', cd = 0) {
    let serv = this.serv
    let extra = serv.name ? `当前面板服务${serv.name}，` : ''
    const msgs = {
      error: `UID${this.uid}更新面板失败，${extra}\n可能是面板服务维护中，请稍后重试...\n或尝试使用【#米游社更新面板】`,
      empty: '请将角色放置在【游戏内】角色展柜，并打开【显示详情】，等待5分钟重新获取面板'
    }
    msg = msgs[msg] || msg
    this.msg(msg)
    // 设置CD
    if (cd) {
      this.setCd(cd)
    }
    return false
  }

  msg (msg) {
    let e = this.e
    if (msg && !e._isReplyed) {
      e.reply(msg)
      e._isReplyed = true
    }
  }

  log (msg) {
    logger.mark(`【面板】${this.uid} ：${msg}`)
  }

  async requestProfile (player, serv) {
    let self = this
    this.serv = serv
    let uid = this.uid
    let reqParam = await serv.getReqParam(uid, player.game)
    let cdTime = await this.inCd()
    if (cdTime && !process.argv.includes('web-debug')) {
      // return this.err(`请求过快，请${cdTime}秒后重试..`)
    }
    await this.setCd(20)
    // 若3秒后还未响应则返回提示
    setTimeout(() => {
      if (self._isReq) {
        this.e.reply(`开始获取uid:${uid}的数据，可能会需要一定时间~`)
      }
    }, 2000)
    // 发起请求
    this.log(`${logger.yellow('开始请求数据')}，面板服务：${serv.name}...`)
    const startTime = new Date() * 1
    let data = {}
    try {
      let params = reqParam.params || {}
      params.timeout = params.timeout || 1000 * 20
      self._isReq = true
      let mys
      switch (serv._cfg.id) {
        case 'mysPanel':
          mys = await MysApi.init(player.e, 'cookie')
          // 获取所有的 Character ID
          // TODO: 要不要从 player._avatars 里面直接提取所有键作为 character_ids？
          //       不这样做主要是不知道 player._avatars 角色是否为最新
          //
          // TODO: 加入仅利用米游社更新部分角色面板，其中部分角色是所有角色的子集
          const character = await mys.getCharacter()
          const character_ids = lodash.map(character.list, (c) => c.id) // .toString() // .slice(0, 2)
          data = JSON.stringify(await mys.getCharacterDetail(character_ids)) // 跟下面的保持一致
          break
        case 'mysPanelHSR':
          mys = await MysApi.init(player.e, 'cookie')
          // 这里的 MysApi 没有完成对星铁 API 的封装，所以暂时先直接使用 getData 调用获取角色面板
          // 值得注意的是原神的角色面板 API 是需要传带查询角色列表的；但是星铁的角色面板 API 是不需要传待查询角色列表的
          data = JSON.stringify(await mys.getData('avatarInfo')) // 跟下面的保持一致
          break
        default:
          let req = await fetch(reqParam.url, params)
          data = await req.text()
      }
      self._isReq = false
      const reqTime = new Date() * 1 - startTime
      this.log(`${logger.green(`请求结束，请求用时${reqTime}ms`)}，面板服务：${serv.name}...`)
      if (data[0] === '<') {
        let titleRet = /<title>(.+)<\/title>/.exec(data)
        if (titleRet && titleRet[1]) {
          data = { error: titleRet[1] }
        } else {
          return this.err('error', 60)
        }
      } else {
        data = JSON.parse(data)
      }
    } catch (e) {
      logger.error('面板请求错误', e)
      if(serv._cfg.id === 'mysPanel') this.e.reply('面板请求错误，请稍后重试...')
      self._isReq = false
      data = {}
    }
    data = await serv.response(data, this, player.game)
    // 设置CD
    cdTime = serv.getCdTime(data)
    if (cdTime) {
      await this.setCd(cdTime)
    }
    if (data === false) {
      return false
    }
    serv.updatePlayer(player, data)
    cdTime = serv.getCdTime(data)
    if (cdTime) {
      await this.setCd(cdTime)
    }
    return player
  }
}
