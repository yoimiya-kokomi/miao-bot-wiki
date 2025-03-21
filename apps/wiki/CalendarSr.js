import lodash from 'lodash'
import fetch from 'node-fetch'
import moment from 'moment'
import Calendar from './Calendar.js'
import { Common, Data } from '#miao'

const ignoreIds = [
  257, // 保密测试参与意愿调研
  194, // 有奖问卷
  203, // 《崩坏：星穹铁道》社媒聚合页上线
  183, // 官方社群一览
  187, // 《崩坏：星穹铁道》防沉迷系统公告
  185, // 《崩坏：星穹铁道》公平运营声明
  171 // 《崩坏：星穹铁道》社区专属工具一览
]

const ignoreReg = /(更新概览|游戏优化|优化说明|内容专题页|专题展示页|版本更新说明|循星归程|调研|防沉迷|米游社|专项意见|更新修复与优化|问卷调查|版本更新通知|更新时间说明|预下载功能|周边限时|周边上新|角色演示|角色PV|版本PV|动画短片|bilibili|激励计划|调整说明|攻略征集|测试招募)/

let CalSr = {
  async reqCalData () {
    let listApi = 'https://hkrpg-api.mihoyo.com/common/hkrpg_cn/announcement/api/getAnnList?game=hkrpg&game_biz=hkrpg_cn&lang=zh-cn&auth_appid=announcement&authkey_ver=1&bundle_id=hkrpg_cn&channel_id=1&level=65&platform=pc&region=prod_gf_cn&sdk_presentation_style=fullscreen&sdk_screen_transparent=true&sign_type=2&uid=100000000'

    let request = await fetch(listApi)
    let listData = await request.json()

    let timeMap
    let timeMapCache = await redis.get('miao:calendarSr:detail')
    let gachaImgs
    let gachaImgsCache = await redis.get('miao:calendarSr:gachaImgs')
    if (timeMapCache && gachaImgsCache) {
      timeMap = JSON.parse(timeMapCache) || {}
      gachaImgs = JSON.parse(gachaImgsCache) || {}
    } else {
      let detailApi = 'https://hkrpg-api-static.mihoyo.com/common/hkrpg_cn/announcement/api/getAnnContent?game=hkrpg&game_biz=hkrpg_cn&lang=zh-cn&bundle_id=hkrpg_cn&platform=pc&region=prod_gf_cn&level=65&channel_id=1'
      let request2 = await fetch(detailApi)
      let detailData = await request2.json()
      timeMap = {}
      if (detailData && detailData.data && detailData.data.list) {
        let versionTime = {
          1.1: '2022-06-07 11:00:00'
        }
        lodash.forEach(detailData.data.list, (ds) => {
          let vRet = /(\d\.\d)版本\S*更新(概览|说明)/.exec(ds.title)
          if (vRet && vRet[1]) {
            let content = /■(?:更新时间)\s*([^■]+)(?:■|$)/.exec(ds.content)
            if (content && content[1]) {
              let tRet = /([0-9\\/\\: ]){9,}/.exec(content[1])
              if (tRet && tRet[0]) {
                versionTime[vRet[1]] = versionTime[vRet[1]] || tRet[0].replace('06:00', '11:00')
              }
            }
          }
        })

        gachaImgs = []
        let ret = function (ds) {
          let { ann_id: annId, content, title } = ds
          if (ignoreReg.test(title)) {
            return true
          }
          content = content.replaceAll('\u003ch1 style=\"\"\u003e', '※')
          content = content.replaceAll('\u003c/h1\u003e', '※')
          content = content.replace(/(<|&lt;)[\w "%:;=\-\\/\\(\\),\\.]+(>|&gt;)/g, '')
          content = /(?:活动时间|活动跃迁|开放时间|开启时间|折扣时间|上架时间)\s*※([^※]+)(※|$)/.exec(content)
          if (!content || !content[1]) {
            return true
          }
          if (/活动跃迁/.test(content)) {
            gachaImgs.push(ds.img)
          }
          content = content[1]
          let annTime = []

          // 第一种简单格式
          let timeRet = /(?:活动时间)?(?:※|\s)*([0-9\\/\\: -]{6,})/.exec(content)
          if (/\d\.\d版本更新后/.test(content)) {
            let vRet = /(\d\.\d)版本更新后/.exec(content)
            let vTime = ''
            if (vRet && vRet[1] && versionTime[vRet[1]]) {
              vTime = versionTime[vRet[1]]
            }
            if (!vTime) {
              return true
            }
            if (/永久开放/.test(content)) {
              annTime = [vTime, '2099/01/01 00:00:00']
            } else {
              timeRet = /([0-9\\/\\: ]){9,}/.exec(content)
              if (timeRet && timeRet[0]) {
                annTime = [vTime, timeRet[0]]
              }
            }
          } else if (timeRet && timeRet[1]) {
            annTime = timeRet[1].split('-')
          }

          if (annTime.length === 2) {
            timeMap[annId] = {
              start: annTime[0].trim().replace(/\//g, '-'),
              end: annTime[1].trim().replace(/\//g, '-')
            }
          }
        }
        lodash.forEach(detailData.data.list, (ds) => ret(ds))
        lodash.forEach(detailData.data.pic_list, (ds) => ret(ds))
      }
      await Data.setCacheJSON('miao:calendarSr:detail', timeMap, 60 * 10)
    }
    return { listData, timeMap, gachaImgs }
  },

  // 深渊日历信息
  getAbyssCal (s1, e1, versionStartTime) {
    let check = []
    let f = 'YYYY-MM-DD HH:mm:ss'
    let newAbyssStart = moment('2023-12-25 04:00:00')

    let abyss1Start = moment(versionStartTime, 'YYYY-MM-DD HH:mm:ss').day(1).hours(4).format(f)

    let diff0 = Math.abs(newAbyssStart.diff(abyss1Start, 'days') % 14)
    if (diff0 !== 0) {
      abyss1Start = moment(abyss1Start).subtract(diff0, 'days').format(f)
    }

    let abyss1End = moment(abyss1Start).add(42, 'days').format(f)
    let abyss2Start = moment(abyss1Start).add(14, 'days').format(f)
    let abyss2End = moment(abyss2Start).add(42, 'days').format(f)
    let abyss3Start = moment(abyss2Start).add(14, 'days').format(f)
    let abyss3End = moment(abyss3Start).add(42, 'days').format(f)
    let abyss4Start = moment(abyss3Start).add(14, 'days').format(f)
    let abyss4End = moment(abyss4Start).add(42, 'days').format(f)
    let abyss5Start = moment(abyss4Start).add(14, 'days').format(f)
    let abyss5End = moment(abyss5Start).add(42, 'days').format(f)

    let abyss0Start = moment(abyss1Start).subtract(14, 'days').format(f)
    let abyss0End = moment(abyss0Start).add(42, 'days').format(f)
    let abyssB1Start = moment(abyss0Start).subtract(14, 'days').format(f)
    let abyssB1End = moment(abyssB1Start).add(42, 'days').format(f)

    let title1 = '「混沌回忆」'
    let title2 = '「虚构叙事」'
    let exchange = false
    let diff = newAbyssStart.diff(abyss0Start, 'days')
    if (diff % 28 === 0) {
      exchange = true
    }
    if (exchange) {
      [title1, title2] = [title2, title1]
    }

    check.push([moment(abyssB1Start), moment(abyssB1End), title1])
    check.push([moment(abyss0Start), moment(abyss0End), title2])
    check.push([moment(abyss1Start), moment(abyss1End), title1])
    check.push([moment(abyss2Start), moment(abyss2End), title2])
    check.push([moment(abyss3Start), moment(abyss3End), title1])
    check.push([moment(abyss4Start), moment(abyss4End), title2])
    check.push([moment(abyss5Start), moment(abyss5End), title1])

    let ret = []
    lodash.forEach(check, (ds) => {
      let [s2, e2] = ds
      let now = moment()
      if ((s2 <= now && now <= e2) || (now <= s2 && s2 <= e1)) {
        ret.push(ds)
      }
    })
    return ret
  },

  getList (ds, target, { startTime, endTime, totalRange, now, timeMap = {}, gachaImgs = [] }) {
    let type = ds.abyssType ? ds.abyssType : 'activity'
    let id = ds.ann_id
    let title = ds.title
    let banner = ds.banner
    let extra = { sort: 5 }
    let detail = timeMap[id] || {}

    if (!title || ignoreIds.includes(id) || ignoreReg.test(title)) {
      return true
    }
    if (/流光定影/.test(title)) {
      type = 'weapon'
      extra.sort = 2
      banner = gachaImgs.shift()
    } else if (/角色活动跃迁/.test(title)) {
      type = 'character'
      extra.sort = 1
      banner = gachaImgs.shift()
    } else if (/版本活动跃迁/.test(title)) { //权宜之计，当前版本把多个池子塞在同一个公告里发布，姑且这么用着罢（）
      type = 'character'
      extra.sort = 1
      banner = gachaImgs.shift()
    } else if (/无名勋礼/.test(title)) {
      type = 'pass'
    }

    let getDate = (d1, d2) => moment(d1 && d1.length > 6 ? d1 : d2)
    let sDate = getDate(detail.start, ds.start_time)
    let eDate = getDate(detail.end, ds.end_time)
    let sTime = moment.max(sDate, startTime)
    let eTime = moment.min(eDate, endTime)

    let sRange = sTime - startTime
    let eRange = eTime - startTime

    let left = sRange / totalRange * 100
    let width = eRange / totalRange * 100 - left

    let label = ''
    if (eDate - sDate > 365 * 24 * 3600 * 1000) {
      if (sDate < now) {
        label = sDate.format('MM-DD HH:mm') + ' 后永久有效'
      } else {
        label = '永久有效'
      }
    } else if (now > sDate && eDate > now) {
      label = eDate.format('MM-DD HH:mm') + ' (' + moment.duration(eDate - now).humanize() + '后结束)'
      if (width > 38) {
        label = sDate.format('MM-DD HH:mm') + ' ~ ' + label
      }
    } else if (sDate > now) {
      label = sDate.format('MM-DD HH:mm') + ' (' + moment.duration(sDate - now).humanize() + '后开始)'
    } else {
      label = sDate.format('MM-DD HH:mm') + ' ~ ' + eDate.format('MM-DD HH:mm')
    }
    if (sDate <= endTime && eDate >= startTime) {
      target.push({
        ...extra,
        id,
        title,
        type,
        mergeStatus: ['activity'].includes(type) ? 1 : 0,
        banner,
        icon: ds.tag_icon,
        left,
        width,
        label,
        duration: eTime - sTime,
        start: sDate.format('MM-DD HH:mm'),
        end: eDate.format('MM-DD HH:mm')
      })
    }
  },

  async get () {
    moment.locale('zh-cn')
    let now = moment()

    let { listData, timeMap, gachaImgs } = await CalSr.reqCalData()
    let dateList = Calendar.getDateList()

    let resultList = []
    let abyss = []

    lodash.forEach(listData.data.list[0].list, (ds) => CalSr.getList(ds, resultList, { ...dateList, now, timeMap, gachaImgs }))
    lodash.forEach(listData.data.pic_list[0].type_list[0].list, (ds) => CalSr.getList(ds, resultList, { ...dateList, now, timeMap, gachaImgs }))
    lodash.forEach(listData.data.pic_list[0].type_list[1].list, (ds) => CalSr.getList(ds, resultList, { ...dateList, now, timeMap, gachaImgs }))

    let versionStartTime
    lodash.forEach(listData.data.list[0].list, (ds) => {
      if (/版本更新(概览|说明)/.test(ds.title)) {
        versionStartTime = ds.start_time
      }
    })

    let abyssCal = CalSr.getAbyssCal(dateList.startTime, dateList.endTime, versionStartTime)
    lodash.forEach(abyssCal, (t) => {
      CalSr.getList({
        title: t[2],
        start_time: t[0].format('YYYY-MM-DD HH:mm'),
        end_time: t[1].format('YYYY-MM-DD HH:mm'),
        abyssType: t[2] === '「混沌回忆」' ? 'abyss-1' : 'abyss-2'
      }, abyss, { ...dateList, now })
    })

    resultList = lodash.sortBy(resultList, ['sort', 'start', 'duration'])

    let charCount = 0
    let charOld = 0
    let weaponCount = 0
    let ret = []
    lodash.forEach(resultList, (li) => {
      if (li.type === 'character') {
        charCount++
        li.left === 0 && charOld++
        li.idx = charCount
      }
      if (li.type === 'weapon') {
        weaponCount++
        li.idx = weaponCount
      }
      if (li.mergeStatus === 1) {
        lodash.forEach(resultList, (li2) => {
          if (li2.mergeStatus === 1 && li.left + li.width <= li2.left) {
            li.mergeStatus = 2
            li2.mergeStatus = 2
            ret.push([li, li2])
            return false
          }
        })
      }
      if (li.mergeStatus !== 2) {
        li.mergeStatus = 2
        ret.push([li])
      }
    })

    return {
      game: 'sr',
      ...dateList,
      list: ret,
      abyss,
      charMode: `char-${charCount}-${charOld}`,
      nowTime: now.format('YYYY-MM-DD HH:mm'),
      nowDate: now.date()
    }
  },

  async render (e) {
    let calData = await CalSr.get()
    let mode = 'calendar'
    if (/(日历列表|活动)$/.test(e.msg)) {
      mode = 'list'
    }

    return await Common.render('wiki/calendar', {
      ...calData,
      displayMode: mode
    }, { e, scale: 1.1 })
  }
}

export default CalSr
