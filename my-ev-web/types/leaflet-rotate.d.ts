// Type ของปลั๊กอิน leaflet-rotate (ไม่มี type มาให้)
import 'leaflet'

declare module 'leaflet-rotate'

declare module 'leaflet' {
  interface MapOptions {
    rotate?: boolean
    bearing?: number
    rotateControl?: boolean | object
    touchRotate?: boolean
    shiftKeyRotate?: boolean
    compassBearing?: boolean
  }
  interface Map {
    /** หมุนแผนที่ (องศา) */
    setBearing(degrees: number): void
    getBearing(): number
  }
  interface MarkerOptions {
    /** มุมหมุนไอคอน (เรเดียน) */
    rotation?: number
    rotateWithView?: boolean
  }
  interface Marker {
    setRotation(radians: number): void
  }
}
