import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import { Geometry } from '../dist/index.js'

const fixturesFolder = 'fixture/good-geojson'
const fixtureNames = readdirSync(new URL(fixturesFolder, import.meta.url))

test('encode/decode good geojson', async (t) => {
  for (const name of fixtureNames) {
    await t.test(`fixture: ${name}`, () => {
      const input = JSON.parse(
        readFileSync(
          new URL(`${fixturesFolder}/${name}`, import.meta.url),
          'utf8'
        )
      )
      assert.deepEqual(Geometry.decode(Geometry.encode(input).finish()), input)
    })
  }
})

test('unsupported geometry type', async (t) => {
  await t.test('throws on unsupported geometry type', () => {
    const badInput = {
      type: 'Unsupported',
      coordinates: [],
      lengths: [],
    }
    assert.throws(() => Geometry.encode(badInput))
  })
})
