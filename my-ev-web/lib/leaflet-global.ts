// leaflet-rotate อ้างถึง L แบบ global จึงต้องผูก L ไว้ที่ window ก่อน import ปลั๊กอิน
import L from 'leaflet'

if (typeof window !== 'undefined') {
  ;(window as unknown as { L: typeof L }).L = L
}
