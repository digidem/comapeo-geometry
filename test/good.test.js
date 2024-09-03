import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import { Geometry } from '../dist/index.js'

const goodFixturesFolder = 'fixture/good'
const fixtureNames = readdirSync(new URL(goodFixturesFolder, import.meta.url))

test('encode/decode good geojson', async (t) => {
  for (const name of fixtureNames) {
    await t.test(`fixture: ${name}`, () => {
      const input = JSON.parse(
        readFileSync(
          new URL(`${goodFixturesFolder}/${name}`, import.meta.url),
          'utf8'
        )
      )
      assert.deepEqual(Geometry.decode(Geometry.encode(input).finish()), input)
    })
  }
})
