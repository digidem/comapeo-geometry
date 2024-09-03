# CoMapeo Geometry Encoding

> GeoJSON geometry encoding and decoding to/from protobufs for CoMapeo.

This repo contains a protobuf definition and encoding/decoding functions for a subset GeoJSON geometry objects. It is used by the CoMapeo project to encode and decode geometries.

- [Encoding Format](#encoding-format)

## Encoding Format

The encoding format is inspired by [Geobuf](https://github.com/mapbox/geobuf), with some changes which prioritize simplicity over optimization and compactness:

- Coordinates are encoding as `double` in original precision instead of Geobuf's `sint64` and rounded to 6 decimal places.
- For polygons and multipolygons, the last position is repeated in the encoded protobuf. Geobuf optimizes storage by skipping the repeated last position.
- Only supports Geometry objects, not Feature objects.

The subset of GeoJSON geometries supported are:

- Only `Point`, `Polygon`, `MultiPoint` and `MultiPolygon` are supported.
- Only 2D positions (coordinates) are supported.
- No support for `bbox`.

Future versions may support more geometry types and 3D positions.
