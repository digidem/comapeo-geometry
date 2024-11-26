import assert from 'node:assert/strict'
import test from 'node:test'

import { Geometry } from '../dist/index.js'

/** @import { Position } from '../dist/index.js' */

test('encoding invalid positions', async (t) => {
  /** @type {Position[]} */
  const badPositions = [
    [180.001, 12],
    [-180.001, 12],
    [123, 90.001],
    [123, -90.001],
  ]

  await t.test('points', () => {
    for (const badPosition of badPositions) {
      assert.throws(() =>
        Geometry.encode({ type: 'Point', coordinates: badPosition })
      )
    }
  })

  await t.test('polygons', () => {
    for (const badPosition of badPositions) {
      assert.throws(() =>
        Geometry.encode({
          type: 'Polygon',
          coordinates: [[[1, 2], [3, 4], badPosition, [5, 6]]],
        })
      )
    }
  })

  await t.test('multipoints', () => {
    for (const badPosition of badPositions) {
      assert.throws(() =>
        Geometry.encode({
          type: 'MultiPoint',
          coordinates: [[1, 2], [3, 4], badPosition, [5, 6]],
        })
      )
    }
  })

  await t.test('multipolygons', () => {
    for (const badPosition of badPositions) {
      assert.throws(() =>
        Geometry.encode({
          type: 'MultiPolygon',
          coordinates: [[[[1, 2], [3, 4], badPosition, [5, 6]]]],
        })
      )
    }
  })
})

test('unsupported geometry type', () => {
  const badInput = {
    type: 'Unsupported',
    coordinates: [],
    lengths: [],
  }
  assert.throws(() => Geometry.encode(badInput))
})
