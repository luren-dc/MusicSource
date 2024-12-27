/*!
 * @name 落月音源
 * @description 落月音源
 * @version 1.0.0
 * @author luren
 * @repository https://github.com/lxmusics/lx-music-api-server
 */

// 是否开启开发模式
const DEV_ENABLE = false

// 音源配置
const musicSources = {
  tx: {
    name: 'tencent',
    type: 'music',
    actions: ['musicUrl'],
    qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    qualitys_code: {
      '128k': 6,
      '320k': 8,
      'flac': 10,
      'flac24bit': 11,
    }
  },
  wy: {
    name: 'netease',
    type: 'music',
    actions: ['musicUrl'],
    qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    qualitys_code: {
      '128k': 2,
      '320k': 4,
      'flac': 5,
      'flac24bit': 6,
    }
  },
}

/**
 * 下面的东西就不要修改了
 */
const {
  EVENT_NAMES,
  request,
  on,
  send,
  utils,
  env,
  version
} = globalThis.lx


/**
 * URL请求
 *
 * @param {string} url - 请求的地址
 * @param {object} options - 请求的配置文件
 * @return {Promise} 携带响应体的Promise对象
 */
const httpFetch = async (url, options = {
  method: 'GET'
}) => {
  console.log('--- start ---', url)
  return new Promise((resolve, reject) => {
    request(url, options, (err, resp) => {
      if (err) reject(err)
      else {
        console.log('API Response:', resp)
        resolve(resp)
      }
    })
  })
}

/**
 * 
 * @param {string} source - 音源
 * @param {object} musicInfo - 歌曲信息
 * @param {string} quality - 音质
 * @returns {Promise<string>} 歌曲播放链接
 * @throws {Error} - 错误消息
 */
const handleGetMusicUrl = async (source, musicInfo, quality) => {

  const songId = musicInfo.songId ?? musicInfo.songmid

  const request = await httpFetch(`https://api.vkeys.cn/v2/music/${musicSources[source].name}?id=${songId}&quality=${musicSources[source].qualitys_code[quality]}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `${env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`}`,
    },
    follow_max: 5,
  })

  const body = request.body

  if (!body || isNaN(Number(body.code))) throw new Error('unknow error')
  if (env != 'mobile') console.groupEnd()
  switch (body.code) {
    case 200:
      console.log(`handleGetMusicUrl(${source}_${musicInfo.songmid}, ${quality}) success, URL: ${body.data}`)
      if (body.data.url == null) throw new Error('No music found')
      return body.data.url
    default:
      console.log(`handleGetMusicUrl(${source}_${musicInfo.songmid}, ${quality}) failed, ${body.msg ? body.msg : 'unknow error'}`)
      throw new Error(body.msg ?? 'unknow error')
  }
}

const handleGetMusicPic = async (source, musicInfo) => {
  switch (source) {
    default:
      throw new Error('action(pic) does not support source(' + source + ')')
  }
}

const handleGetMusicLyric = async (source, musicInfo) => {
  switch (source) {
    default:
      throw new Error('action(lyric) does not support source(' + source + ')')
  }
}

// 监听 LX Music 请求事件
on(EVENT_NAMES.request, async ({ action, source, info }) => {
  console.log(`Handle Action(${action})`, {
    source,
    quality: info.type,
    musicInfo: info.musicInfo,
  })

  const handlers = {
    musicUrl: () => handleGetMusicUrl(source, info.musicInfo, info.type),
    pic: () => handleGetMusicPic(source, info.musicInfo),
    lyric: () => handleGetMusicLyric(source, info.musicInfo),
  }
  
  if (!handlers[action]) {
    const errorMsg = `action(${action}) not supported`
    console.error(errorMsg)
    throw new Error(errorMsg)
  }
  
  try {
    return await handlers[action]()
  } catch (err) {
    console.error(`Failed to handle action(${action}):`, err.message)
    throw err
  }
})

send(EVENT_NAMES.inited, {
  status: true,
  openDevTools: DEV_ENABLE,
  sources: musicSources
})