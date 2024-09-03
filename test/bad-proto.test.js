import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import { Geometry } from '../dist/index.js'
import { Geometry as GeometryProto } from '../dist/proto/geometry.js'

const fixturesFolder = 'fixture/bad-proto'
const fixtureNames = readdirSync(new URL(fixturesFolder, import.meta.url))

test('decode bad protobufs', async (t) => {
  for (const name of fixtureNames) {
    await t.test(`fixture: ${name}`, () => {
      const input = JSON.parse(
        readFileSync(
          new URL(`${fixturesFolder}/${name}`, import.meta.url),
          'utf8'
        )
      )
      const encoded = GeometryProto.encode(input).finish()
      assert.throws(() => Geometry.decode(encoded))
    })
  }
})
