export type MediaLinks = {
  logo: string
  link: string
  name: string
}

export type ExtraVideos = {
  name: string
  key: string
  type: string
}

export type MediaCast = {
  adult: boolean
  department: string
  name: string
  original_name: string
  popularity: number
  profile_path: string
  castId: number
  character: string
}

export type TGMeta = {
  fileId: string
  fileLink: string
}

export type MediaMeta = {
  type: string
  size: number
  bitRate: number
  bitDepth: number
  videoCodec: string
  ext: string
  frameRate: number
}

export enum ImageTypeEnum {
  BACKDROP = 'backdrop',
  POSTER = 'poster',
  LOGO = 'logo',
  THUMBNAIL = 'thumbnail',
}
