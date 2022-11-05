import fs from 'fs'
import { promisify } from 'util'
import { pipeline } from 'stream'
import { segment } from 'oicq'
import MD5 from 'md5'
import fetch from 'node-fetch'
import lodash from 'lodash'
import { Data } from '../../components/index.js'
import { Character } from '../../models/index.js'

const resPath = process.cwd() + '/plugins/miao-plugin/resources/'
let regex = /^#?\s*(?:喵喵)?(?:上传|添加)(.+)(?:照片|写真|图片|图像)\s*$/

export async function uploadCharacterImg (e) {
  let promise = await isAllowedToUploadCharacterImage(e)
  if (!promise) {
    return false
  }

  let imageMessages = []
  let msg = e.msg
  let regRet = regex.exec(msg)
  // 通过解析正则获取消息中的角色名
  if (!regRet || !regRet[1]) {
    return false
  }
  let char = Character.get(regRet[1])
  if (!char || !char.name) {
    return false
  }
  let name = char.name
  for (let val of e.message) {
    if (val.type === 'image') {
      imageMessages.push(val)
    }
  }
  if (imageMessages.length === 0) {
    let source
    if (e.isGroup) {
      // 支持at图片添加，以及支持后发送
      source = (await e.group.getChatHistory(e.source?.seq, 1)).pop()
    } else {
      source = (await e.friend.getChatHistory((e.source?.time + 1), 1)).pop()
    }
    if (source) {
      for (let val of source.message) {
        if (val.type === 'image') {
          imageMessages.push(val)
        }
      }
    }
  }
  if (imageMessages.length <= 0) {
    e.reply('消息中未找到图片，请将要发送的图片与消息一同发送或引用要添加的图像..')
    return true
  }
  await saveImages(e, name, imageMessages)
  return true
}

async function saveImages (e, name, imageMessages) {
  let imgMaxSize = e?.groupConfig?.imgMaxSize || 5
  let pathSuffix = `character-img/${name}/upload`
  let path = resPath + pathSuffix

  if (!fs.existsSync(path)) {
    Data.createDir(pathSuffix, resPath)
  }
  let senderName = lodash.truncate(e.sender.card, { length: 8 })
  let imgCount = 0
  let urlMap = {}
  for (let val of imageMessages) {
    if (!val.url || urlMap[val.url]) {
      continue
    }
    urlMap[val.url] = true
    const response = await fetch(val.url)
    if (!response.ok) {
      e.reply('图片下载失败。')
      return true
    }
    if (response.headers.get('size') > 1024 * 1024 * imgMaxSize) {
      e.reply([segment.at(e.user_id, senderName), '添加失败：图片太大了。'])
      return true
    }
    let fileName = val.file.substring(0, val.file.lastIndexOf('.'))
    let fileType = val.file.substring(val.file.lastIndexOf('.') + 1)
    if (response.headers.get('content-type') === 'image/gif') {
      fileType = 'gif'
    }
    let imgPath = `${path}/${fileName}.${fileType}`
    const streamPipeline = promisify(pipeline)
    await streamPipeline(response.body, fs.createWriteStream(imgPath))

    // 使用md5作为文件名
    let buffers = fs.readFileSync(imgPath)
    let base64 = Buffer.from(buffers, 'base64').toString()
    let md5 = MD5(base64)
    let newImgPath = `${path}/${md5}.${fileType}`
    if (fs.existsSync(newImgPath)) {
      fs.unlink(newImgPath, (err) => {
        console.log('unlink', err)
      })
    }
    fs.rename(imgPath, newImgPath, () => {
    })
    imgCount++
    Bot.logger.mark(`添加成功: ${path}/${fileName}`)
  }
  e.reply([segment.at(e.user_id, senderName), `\n成功添加${imgCount}张${name}图片。`])
  return true
}

async function isAllowedToUploadCharacterImage (e) {
  if (!e.message) {
    return false
  }
  if (!e.msg) {
    return false
  }
  // master直接返回true
  if (e.isMaster) {
    return true
  }
  if (e.isPrivate) {
    e.reply('只有主人才能添加...')
    return false
  }
  let groupId = e.group_id
  if (!groupId) {
    return false
  }
  const addLimit = e.groupConfig?.imgAddLimit || 2
  const isAdmin = ['owner', 'admin'].includes(e.sender.role)
  if (addLimit === 2) {
    e.reply('只有主人才能添加...')
    return false
  }
  if (addLimit === 1 && !isAdmin) {
    e.reply('只有管理员才能添加...')
    return false
  }
  return true
}
