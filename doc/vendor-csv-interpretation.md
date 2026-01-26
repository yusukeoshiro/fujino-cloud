# Vendor CSV Interpretation and Intermediate Schema

This document summarizes how we compare vendor CSV formats (currently Fitogether and Knows),
what we consider ambiguous, and how we normalize into an intermediate schema for storage,
display, and scoring.

## Goals

- Keep the raw CSV file unchanged for audit and re-processing.
- Normalize vendor-specific data into a stable intermediate schema.
- Keep vendor-specific, non-ambiguous fields in the intermediate schema, tagged by vendor.
- Avoid storing ambiguous bucketed fields (zone-specific values) unless they are required
  to derive the intermediate fields.
- Make the mapping configurable per org because zone boundaries are user-defined.

## Raw CSV storage

- Store the original CSV as-is in Firebase Storage.
- Use `performanceAssessmentId` as the filename or path segment to avoid collisions.
- Persist the storage path and the mapping snapshot used for ingestion so we can audit
  or re-process later.

## Intermediate schema

The intermediate schema is a single flat schema. Core fields are non-nullable and
everything else is nullable. There is no vendor tagging or nesting.

Core (non-nullable) fields:

- `totalDistanceM`
- `highIntensityDistanceM`
- `accelerationCountTotal`
- `decelerationCountTotal`
- `workloadConsumptionPoints`

Nullable fields (show-only or optional inputs):

- `lowIntensityDistanceM` (walking)
- `durationMin` (parsed and floored)
- `maxSpeedKMH` (if provided by the vendor)
- `sprintCount` (if provided by the vendor)
- `highIntensityRate`
- `lowIntensityRate`
- `totalDistanceMPerMin`
- `noOfHSR`
- `hsrDistanceM`
- `sprintDistanceM`
- `expAccCount`
- `expDecCount`

The intermediate schema is used for display and workload consumption points.
Zone-specific fields (for example, `SPD_D_Z6`) are considered ambiguous and are
not stored directly.

## Vendor comparison

This is a quick comparison based on the Fitogether sample CSV in
`test-assets/training-scenario-2.input.csv` and the Knows example headers.

### Raw CSV fields (tabular)

- `identify`: used only to match a person.
- `core`: contributes to core fields (`totalDistanceM`, `highIntensityDistanceM`,
  `accelerationCountTotal`, `decelerationCountTotal`).
- `show`: optional/nullable fields used for display.

Contribute to:

- Indicates the intermediate schema field that the raw field feeds into.

Keep:

- `yes`: stored in the intermediate schema or vendor-tagged fields.
- `no`: discarded after ingest (raw CSV still stored).

Fitogether:

| Raw field                                 | Description                     | Contribute to                         | Keep | Notes                                          |
| ----------------------------------------- | ------------------------------- | ------------------------------------- | ---- | ---------------------------------------------- |
| `Date`                                    | Session date in the vendor file |                                       |      | Used to set assessment date/name               |
| `Activity Type`                           | Vendor activity category        |                                       |      |                                                |
| `Activity Title`                          | Vendor activity title           |                                       |      |                                                |
| `Session Type`                            | Vendor session category         |                                       |      |                                                |
| `Session Title`                           | Vendor session title            |                                       |      |                                                |
| `Start Time`                              | Vendor start time               |                                       |      |                                                |
| `End Time`                                | Vendor end time                 |                                       |      |                                                |
| `Jersey No.`                              | Jersey/external identifier      |                                       |      | Used only for matching                         |
| `Player Name`                             | Player name                     |                                       |      | Used only for matching                         |
| `Position`                                | Player position                 |                                       |      | Not persisted                                  |
| `Duration (min)`                          | Session duration (minutes)      | durationMin                           | yes  |                                                |
| `Total Distance (m)`                      | Total distance                  | totalDistanceM                        | yes  | `totalDistanceM`                               |
| `Total Distance/min (m/min)`              | Distance per minute             | totalDistanceMPerMin                  | yes  |                                                |
| `Max Speed (km/h)`                        | Max speed                       | maxSpeedKMH                           | yes  |                                                |
| `No. of HSR (times)`                      | High-speed run count            | noOfHSR                               | yes  |                                                |
| `HSR Distance (m)`                        | High-speed run distance         | hsrDistanceM                          | yes  |                                                |
| `No. of Sprint (times)`                   | Sprint count                    | sprintCount                           | yes  | `sprintCount`                                  |
| `Sprint Distance (m)`                     | Sprint distance                 | sprintDistanceM                       | yes  |                                                |
| `Speed Zone 1 Distance (m)`               | Zone distance (ambiguous)       | lowIntensityDistanceM (if configured) | no   | Used for `lowIntensityDistanceM` if configured |
| `Speed Zone 2 Distance (m)`               | Zone distance (ambiguous)       |                                       | no   |                                                |
| `Speed Zone 3 Distance (m)`               | Zone distance (ambiguous)       |                                       | no   |                                                |
| `Speed Zone 4 Distance (m)`               | Zone distance (ambiguous)       |                                       | no   |                                                |
| `Speed Zone 5 Distance (m)`               | Zone distance (ambiguous)       |                                       | no   |                                                |
| `Speed Zone 6 Distance (m)`               | Zone distance (ambiguous)       |                                       | no   |                                                |
| `Speed Zone 7 Distance (m)`               | Zone distance (ambiguous)       |                                       | no   |                                                |
| `Speed Zone 8 Distance (m)`               | Zone distance (ambiguous)       | highIntensityDistanceM (default)      | no   | Default mapping for `highIntensityDistanceM`   |
| `Speed Zone 9 Distance (m)`               | Zone distance (ambiguous)       | highIntensityDistanceM (default)      | no   | Default mapping for `highIntensityDistanceM`   |
| `Acceleration Zone 4 Entry Count (times)` | Acceleration count (ambiguous)  |                                       | no   |                                                |
| `Acceleration Zone 5 Entry Count (times)` | Acceleration count (ambiguous)  | accelerationCountTotal (default)      | no   | Default mapping for `accelerationCountTotal`   |
| `Acceleration Zone 6 Entry Count (times)` | Acceleration count (ambiguous)  | accelerationCountTotal (default)      | no   | Default mapping for `accelerationCountTotal`   |
| `Deceleration Zone 4 Entry Count (times)` | Deceleration count (ambiguous)  |                                       | no   |                                                |
| `Deceleration Zone 5 Entry Count (times)` | Deceleration count (ambiguous)  | decelerationCountTotal (default)      | no   | Default mapping for `decelerationCountTotal`   |
| `Deceleration Zone 6 Entry Count (times)` | Deceleration count (ambiguous)  | decelerationCountTotal (default)      | no   | Default mapping for `decelerationCountTotal`   |
| `No. of Exp. Acc. (times)`                | Explosive acceleration count    | expAccCount                           | yes  |                                                |
| `No. of Exp. Dec. (times)`                | Explosive deceleration count    | expDecCount                           | yes  |                                                |

Knows:

| Raw field     | Description                    | Contribute to                    | Keep | Notes                                          |
| ------------- | ------------------------------ | -------------------------------- | ---- | ---------------------------------------------- |
| `Name`        | Player name                    |                                  |      | Used only for matching                         |
| `Duration_TF` | Session duration (H:MM:SS)     | durationMin                      | yes  | Floored to minutes                             |
| `Distance`    | Total distance                 | totalDistanceM                   | yes  | `totalDistanceM`                               |
| `SPD MX`      | Max speed                      | maxSpeedKMH                      | yes  |                                                |
| `SPD_D_Z1`    | Zone distance (ambiguous)      | lowIntensityDistanceM            | no   | Used for `lowIntensityDistanceM` if configured |
| `SPD_D_Z4`    | Zone distance (ambiguous)      |                                  | no   | Used only if configured                        |
| `SPD_D_Z5`    | Zone distance (ambiguous)      | highIntensityDistanceM (default) | no   | Default mapping for `highIntensityDistanceM`   |
| `SPD_D_Z6`    | Zone distance (ambiguous)      | highIntensityDistanceM (default) | no   | Default mapping for `highIntensityDistanceM`   |
| `Sprint`      | Sprint count                   | sprintCount                      | yes  | `sprintCount`                                  |
| `Accel_Z1`    | Acceleration count (ambiguous) | accelerationCountTotal (default) | no   | Default mapping for `accelerationCountTotal`   |
| `Accel_Z2`    | Acceleration count (ambiguous) | accelerationCountTotal (default) | no   | Default mapping for `accelerationCountTotal`   |
| `Accel_Z3`    | Acceleration count (ambiguous) | accelerationCountTotal (default) | no   | Default mapping for `accelerationCountTotal`   |
| `Decel_Z1`    | Deceleration count (ambiguous) | decelerationCountTotal (default) | no   | Default mapping for `decelerationCountTotal`   |
| `Decel_Z2`    | Deceleration count (ambiguous) | decelerationCountTotal (default) | no   | Default mapping for `decelerationCountTotal`   |
| `Decel_Z3`    | Deceleration count (ambiguous) | decelerationCountTotal (default) | no   | Default mapping for `decelerationCountTotal`   |

### Intermediate schema fields

| API name                    | Description                                  | Vendors           | Type    | Core     | metricDefinitionId     |
| --------------------------- | -------------------------------------------- | ----------------- | ------- | -------- | ---------------------- |
| `totalDistanceM`            | Total distance in meters                     | Fitogether, Knows | raw     | core     | `P6Zu5epLjDOaDQq20Stx` |
| `highIntensityDistanceM`    | High-intensity distance (vendor-configured)  | Fitogether, Knows | derived | core     | `Kn39OEkrpQCMQAtMQb5J` |
| `accelerationCountTotal`    | Total acceleration count (vendor-configured) | Fitogether, Knows | derived | core     | `XYpyu5CZTDZmMY9DbfNG` |
| `decelerationCountTotal`    | Total deceleration count (vendor-configured) | Fitogether, Knows | derived | core     | `D7aoPeenTMYu3CxfR6v7` |
| `lowIntensityDistanceM`     | Low-intensity (walking) distance             | Fitogether, Knows | derived | non-core | `0xbH1n71xspfVRddG92Q` |
| `durationMin`               | Session duration in minutes (floored)        | Fitogether, Knows | raw     | non-core | `KkLOxGTCHY2uVOMjLtQE` |
| `maxSpeedKMH`               | Max speed in km/h                            | Fitogether, Knows | raw     | non-core | `Q4dPRJ2eqeNR0Bg4DI3E` |
| `sprintCount`               | Sprint count                                 | Fitogether, Knows | raw     | non-core | `ZfqkRYcNfvwYioquCx5h` |
| `highIntensityRate`         | High-intensity distance share of total       | Fitogether, Knows | derived | non-core | `RObqK0yOMf4NXhiWig6p` |
| `lowIntensityRate`          | Low-intensity distance share of total        | Fitogether, Knows | derived | non-core | `oOQMjHICxmf3nLwvDitk` |
| `totalDistanceMPerMin`      | Distance per minute                          | Fitogether        | raw     | non-core | `I7i8bessV96ciVnFw5IB` |
| `noOfHSR`                   | High-speed run count                         | Fitogether        | raw     | non-core | `yZ0yLsB60V8NTKrn3Hkw` |
| `hsrDistanceM`              | High-speed run distance in meters            | Fitogether        | raw     | non-core | `Lnznq7uAwamZD683xQ5b` |
| `sprintDistanceM`           | Sprint distance in meters                    | Fitogether        | raw     | non-core | `mVykVPzBokSZ0l4C7YhJ` |
| `expAccCount`               | Explosive acceleration count                 | Fitogether        | raw     | non-core | `XLp9zGyDi0PgkNHn61ln` |
| `expDecCount`               | Explosive deceleration count                 | Fitogether        | raw     | non-core | `vMV5RRPagpuPxkoU8F2T` |
| `workloadConsumptionPoints` | Workload consumption points                  |                   | derived | core     | `b3DroV7arY2KLRUJpdtq` |

### Ambiguous buckets

All zone-labeled fields are ambiguous because zone definitions are user-defined:

- Fitogether: `Speed Zone X Distance`, `Acceleration Zone X Entry Count`,
  `Deceleration Zone X Entry Count`
- Knows: `SPD_D_Zx`, `Accel_Zx`, `Decel_Zx`

These fields are used only as inputs to configured derived fields (see below) and
are not stored in the intermediate schema.

## Person matching

We use vendor-provided identifiers to match CSV rows to existing persons. These
fields are not persisted in the intermediate schema.

- Fitogether: match by jersey number (external id) or name.
- Knows: match by name only.

Name matching should be exact after trimming whitespace. No fuzzy matching is used
to avoid incorrect mappings.

## Configurable mapping (per org)

Each org should configure how to derive intermediate fields from vendor columns:

- `highIntensityDistanceM`: list of raw columns to sum
- `lowIntensityDistanceM`: list of raw columns to sum
- `accelerationCountTotal`: list of raw columns to sum
- `decelerationCountTotal`: list of raw columns to sum
- `fieldMap` for unambiguous fields (name, duration, total distance, max speed, sprint count)
- Optional unit conversions

Example mapping for Knows:

```
highIntensityDistanceM = SPD_D_Z5 + SPD_D_Z6
lowIntensityDistanceM = SPD_D_Z1
accelerationCountTotal = Accel_Z1 + Accel_Z2 + Accel_Z3
decelerationCountTotal = Decel_Z1 + Decel_Z2 + Decel_Z3
durationMin = floor(Duration_TF)
```

## Validation

- On upload, validate that the required columns for the org's configured vendor
  are present.
- Reject CSV files that do not match the expected schema so we do not silently
  compute incorrect values.
