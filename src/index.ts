import { Geometry as GeometryProto, GeometryType } from './proto/geometry.js'
import type {
  Geometry as GeometryJson,
  Position,
  LinearRing,
  Point,
  MultiPoint,
  Polygon,
  MultiPolygon,
} from './json/geometry.js'

export type * from './json/geometry.js'
export type Geometry = GeometryJson
export { GeometryType }

// Will make transition to ts-proto@2 easier, which uses different interfaces
// for Writer and Reader
type DecodeInput = Parameters<typeof GeometryProto.decode>[0]
type Writer = ReturnType<typeof GeometryProto.encode>

export const Geometry = {
  encode(message: GeometryJson, writer?: Writer): Writer {
    switch (message.type) {
      case 'Point':
        return GeometryProto.encode(encodePoint(message), writer)
      case 'MultiPoint':
        return GeometryProto.encode(encodeMultiPoint(message), writer)
      case 'Polygon':
        return GeometryProto.encode(encodePolygon(message), writer)
      case 'MultiPolygon':
        return GeometryProto.encode(encodeMultiPolygon(message), writer)
      default:
        throw new ExhaustivenessError(
          message,
          `Unsupported geometry type: ${(message as any).type}`
        )
    }
  },
  decode(input: DecodeInput, length?: number): GeometryJson {
    const geometryProto = GeometryProto.decode(input, length)
    validateRawCoords(geometryProto.coordinates)
    switch (geometryProto.type) {
      case GeometryType.POINT:
        return decodePoint(geometryProto)
      case GeometryType.MULTI_POINT:
        return decodeMultiPoint(geometryProto)
      case GeometryType.POLYGON:
        return decodePolygon(geometryProto)
      case GeometryType.MULTI_POLYGON:
        return decodeMultiPolygon(geometryProto)
      default:
        throw new Error(`Unsupported geometry type: ${geometryProto.type}`)
    }
  },
}

function decodePoint({ coordinates: rawCoords }: GeometryProto): Point {
  return {
    type: 'Point',
    coordinates: rawCoords as Position,
  }
}

function encodePoint({ coordinates }: Point): GeometryProto {
  return {
    lengths: [],
    type: GeometryType.POINT,
    coordinates,
  }
}

function decodeMultiPoint({
  coordinates: rawCoords,
}: GeometryProto): MultiPoint {
  return {
    type: 'MultiPoint',
    coordinates: readPositionArray(rawCoords, {
      start: 0,
      length: rawCoords.length / 2,
    }),
  }
}

function encodeMultiPoint({ coordinates }: MultiPoint): GeometryProto {
  return {
    lengths: [],
    type: GeometryType.MULTI_POINT,
    coordinates: coordinates.flat(),
  }
}

function decodePolygon({
  coordinates: rawCoords,
  lengths,
}: GeometryProto): Polygon {
  lengths = lengths.length === 0 ? [rawCoords.length / 2] : lengths
  const rings = new Array<LinearRing>(lengths.length)
  let start = 0
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]
    const ring = readPositionArray(rawCoords, {
      start,
      length,
    })
    validateLinearRing(ring)
    rings[i] = ring
    start += length * 2
  }
  return {
    type: 'Polygon',
    coordinates: rings,
  }
}

function encodePolygon({ coordinates }: Polygon): GeometryProto {
  const lengths = coordinates.map((ring) => ring.length)
  return {
    // For simple (most common?) case, omit lengths
    lengths: lengths.length === 1 ? [] : lengths,
    type: GeometryType.POLYGON,
    coordinates: coordinates.flat(2),
  }
}

function decodeMultiPolygon({
  coordinates: rawCoords,
  lengths,
}: GeometryProto): MultiPolygon {
  lengths = lengths.length === 0 ? [1, 1, rawCoords.length / 2] : lengths
  const polygons = new Array<LinearRing[]>(lengths[0])
  let start = 0
  for (let i = 0, j = 1; i < lengths[0]; i++) {
    const ringsLength = lengths[j + i]
    const rings = new Array<LinearRing>(ringsLength)
    for (let k = 0; k < ringsLength; k++) {
      const length = lengths[j + 1 + i + k]
      const ring = readPositionArray(rawCoords, {
        start,
        length,
      })
      validateLinearRing(ring)
      rings[k] = ring
      start += length * 2
    }
    j += ringsLength
    polygons[i] = rings
  }
  return {
    type: 'MultiPolygon',
    coordinates: polygons,
  }
}

function encodeMultiPolygon({ coordinates }: MultiPolygon): GeometryProto {
  const lengths: number[] = [coordinates.length]
  for (const polygon of coordinates) {
    lengths.push(polygon.length)
    for (const ring of polygon) {
      lengths.push(ring.length)
    }
  }
  return {
    // For simple (most common?) case, omit lengths
    lengths: lengths.length === 3 ? [] : lengths,
    type: GeometryType.MULTI_POLYGON,
    coordinates: coordinates.flat(3),
  }
}

function validateRawCoords(rawCoords: number[]) {
  if (rawCoords.length === 0) {
    throw new Error('`coordinates` must not be empty')
  }
  if (rawCoords.length % 2 !== 0) {
    throw new Error('`coordinates` must have an even number of elements')
  }
}

function validateLinearRing(ring: Position[]): asserts ring is LinearRing {
  if (ring.length < 4) {
    throw new Error('Invalid number of coordinates in linear ring')
  }
}

function readPositionArray(
  rawCoords: number[],
  {
    start,
    length,
    dimensions = 2,
  }: { start: number; length: number; dimensions?: 2 }
): Position[] {
  const positions = new Array<Position>(length)
  if (rawCoords.length < start + length * dimensions) {
    throw new Error('Invalid coordinate array, not enough data')
  }
  for (let i = 0; i < length; i++) {
    const position = new Array<number>(dimensions) as Position
    for (let j = 0; j < dimensions; j++) {
      position[j] = rawCoords[start + i * dimensions + j]
    }
    positions[i] = position
  }
  return positions
}

class ExhaustivenessError extends Error {
  constructor(
    value: never,
    message: string = `Exhaustiveness check failed. ${value} should be impossible`
  ) {
    super(message)
  }
}
