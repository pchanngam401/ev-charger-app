import type { Station } from '@/types/station'

// ข้อมูลแบรนด์ของผู้ให้บริการสถานีชาร์จ
// logo = ไอคอนจริงของแต่ละ provider (เก็บไว้ที่ public/logos/)
export interface ProviderBrand {
  key: string
  name: string // ชื่อที่แสดงใน popup
  logo: string
  color: string // สีหลักของแบรนด์ ใช้เป็นกรอบหมุด
}

export const PROVIDERS: Record<string, ProviderBrand> = {
  ptt:       { key: 'ptt',       name: 'EV Station PluZ (PTT)', logo: '/logos/ptt.webp',       color: '#1F5EAB' },
  ea:        { key: 'ea',        name: 'EA Anywhere',           logo: '/logos/ea.webp',        color: '#8DC63F' },
  sharge:    { key: 'sharge',    name: 'SHARGE',                logo: '/logos/sharge.webp',    color: '#ED1B34' },
  shell:     { key: 'shell',     name: 'Shell Recharge',        logo: '/logos/shell.webp',     color: '#DD1D21' },
  elex:      { key: 'elex',      name: 'EleX by EGAT',          logo: '/logos/elex.webp',      color: '#0047BB' },
  altervim:  { key: 'altervim',  name: 'Altervim',              logo: '/logos/altervim.webp',  color: '#3FAE49' },
  mg:        { key: 'mg',        name: 'MG Super Charge',       logo: '/logos/mg.webp',        color: '#D7141A' },
  tesla:     { key: 'tesla',     name: 'Tesla Supercharger',    logo: '/logos/tesla.webp',     color: '#E31937' },
  galvanic:  { key: 'galvanic',  name: 'Galvanic',              logo: '/logos/galvanic.webp',  color: '#6CC04A' },
  evolt:     { key: 'evolt',     name: 'EVolt',                 logo: '/logos/evolt.webp',     color: '#F26B21' },
  gwm:       { key: 'gwm',       name: 'GWM',                   logo: '/logos/gwm.webp',       color: '#222222' },
  mea:       { key: 'mea',       name: 'MEA EV',                logo: '/logos/mea.webp',       color: '#F47920' },
  onecharge: { key: 'onecharge', name: 'OneCharge',             logo: '/logos/onecharge.webp', color: '#1BA0D8' },
  haup:      { key: 'haup',      name: 'Haup',                  logo: '/logos/haup.webp',      color: '#1E5BC6' },
}

// คำที่ใช้จับคู่ค่าในคอลัมน์ Provider / Operator / Name → key ของแบรนด์
// (ตรวจตามลำดับ — คำที่เฉพาะเจาะจงกว่าต้องมาก่อน)
const ALIASES: [RegExp, string][] = [
  [/shell/i, 'shell'],
  [/tesla/i, 'tesla'],
  [/sharge/i, 'sharge'],
  [/pluz|ptt|ปตท/i, 'ptt'],
  [/^ea\b|ea anywhere|e@ ?anywhere|energy absolute/i, 'ea'],
  [/elex|egat|กฟผ/i, 'elex'],
  [/altervim/i, 'altervim'],
  [/^mg\b|mg super/i, 'mg'],
  [/galvanic/i, 'galvanic'],
  [/evolt/i, 'evolt'],
  [/gwm|great wall/i, 'gwm'],
  [/^mea\b|กฟน|การไฟฟ้านครหลวง/i, 'mea'],
  [/one ?charge/i, 'onecharge'],
  [/haup/i, 'haup'],
]

function match(value: string | null | undefined): ProviderBrand | null {
  const v = value?.trim()
  if (!v) return null
  for (const [re, key] of ALIASES) if (re.test(v)) return PROVIDERS[key]
  return null
}

// Operator มาก่อน Provider เช่น สถานี Shell ที่ Sharge เป็นผู้ดูแล (Provider=Sharge, Operator=Shell)
export function getProviderBrand(station: Station): ProviderBrand | null {
  return match(station.Operator) ?? match(station.Provider) ?? null
}
