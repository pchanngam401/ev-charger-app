// โครงสร้างตรงกับตาราง stations ใน Supabase
export interface Station {
  id?: number
  Name: string
  Name_EN?: string | null
  Address: string | null
  description: string | null
  Latitude: number
  Longitude: number
  Provider: string | null
  Power?: string | null
  Operator?: string | null
  Hours?: string | null
}

export interface NearbyResponse {
  count: number
  data: Station[]
}
