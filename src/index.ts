import { Geometry as GeometryProto, GeometryType } from './proto/geometry.js'
import type {
  Geometry as GeometryJson,
  Position,
  LinearRing,
  Point,
  LineString,
  MultiLineString,
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
      case 'LineString':
        return GeometryProto.encode(encodeLineString(message), writer)
      case 'MultiLineString':
        return GeometryProto.encode(encodeMultiLineString(message), writer)
      case 'MultiPoint':
        return GeometryProto.encode(encodeMultiPoint(message), writer)
      case 'Polygon':
        return GeometryProto.encode(encodePolygon(message), writer)
      case 'MultiPolygon':
        return GeometryProto.encode(encodeMultiPolygon(message), writer)
      default:
        throw new ExhaustivenessError(
          message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      case GeometryType.LINE_STRING:
        return decodeLineString(geometryProto)
      case GeometryType.MULTI_LINE_STRING:
        return decodeMultiLineString(geometryProto)
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

function decodeLineString({
  coordinates: rawCoords,
}: GeometryProto): LineString {
  const coordinates = readPositionArray(rawCoords, {
    start: 0,
    length: rawCoords.length / 2,
  })
  assertLengthIsAtLeast(
    coordinates,
    2,
    'LineString must have at least 2 positions'
  )
  return {
    type: 'LineString',
    coordinates,
  }
}

function encodeLineString({ coordinates }: LineString): GeometryProto {
  return {
    lengths: [],
    type: GeometryType.LINE_STRING,
    coordinates: coordinates.flat(),
  }
}

function decodeMultiLineString({
  coordinates: rawCoords,
  lengths,
}: GeometryProto): MultiLineString {
  let coordinates

  if (lengths.length === 0) {
    const line = readPositionArray(rawCoords, {
      start: 0,
      length: rawCoords.length / 2,
    })
    assertLengthIsAtLeast(
      line,
      2,
      'MultiLineString line must have at least 2 positions'
    )
    coordinates = [line]
  } else {
    let start = 0
    coordinates = lengths.map((length) => {
      const line = readPositionArray(rawCoords, { start, length })
      assertLengthIsAtLeast(
        line,
        2,
        'MultiLineString line must have at least 2 positions'
      )
      start += length * 2
      return line
    })
  }

  assertLengthIsAtLeast(
    coordinates,
    1,
    'MultiLineString must have at least 1 line'
  )

  return {
    type: 'MultiLineString',
    coordinates,
  }
}

function encodeMultiLineString({
  coordinates,
}: MultiLineString): GeometryProto {
  return {
    lengths:
      // For simple (most common?) case, omit lengths
      coordinates.length === 1 ? [] : coordinates.map((line) => line.length),
    type: GeometryType.MULTI_LINE_STRING,
    coordinates: coordinates.flat(3),
  }
}

function decodeMultiPoint({
  coordinates: rawCoords,
}: GeometryProto): MultiPoint {
  const coordinates = readPositionArray(rawCoords, {
    start: 0,
    length: rawCoords.length / 2,
  })
  assertLengthIsAtLeast(coordinates, 1, 'MultiPoint must have at least 1 point')
  return {
    type: 'MultiPoint',
    coordinates,
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
  assertLengthIsAtLeast(rings, 1, 'Polygon must have at least 1 ring')
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
  const polygons = new Array<BuildArrayMinLength<LinearRing, 1, []>>(lengths[0])
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
    assertLengthIsAtLeast(rings, 1, 'Polygon must have at least 1 ring')
    polygons[i] = rings
  }
  assertLengthIsAtLeast(
    polygons,
    1,
    'MultiPolygon must have at least 1 polygon'
  )
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
  for (let i = 0; i < rawCoords.length; i++) {
    if (i % 2 === 0) {
      validateLongitude(rawCoords[i])
    } else {
      validateLatitude(rawCoords[i])
    }
  }
}

const rangeValidator = (max: number) => (value: number) => {
  if (Math.abs(value) > max) {
    throw new Error(`Coordinate value must be between -${max} and ${max}`)
  }
}
const validateLatitude = rangeValidator(90)
const validateLongitude = rangeValidator(180)

function validateLinearRing(ring: Position[]): asserts ring is LinearRing {
  assertLengthIsAtLeast(ring, 4, 'Invalid number of coordinates in linear ring')
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

type BuildArrayMinLength<
  T,
  N extends number,
  Current extends T[],
> = Current['length'] extends N
  ? [...Current, ...T[]]
  : BuildArrayMinLength<T, N, [...Current, T]>

function assertLengthIsAtLeast<T, N extends number>(
  arr: T[],
  length: N,
  message: string
): asserts arr is BuildArrayMinLength<T, N, []> {
  if (arr.length < length) throw new Error(message)
}

class ExhaustivenessError extends Error {
  constructor(
    value: never,
    message: string = `Exhaustiveness check failed. ${value} should be impossible`
  ) {
    super(message)
  }
}
