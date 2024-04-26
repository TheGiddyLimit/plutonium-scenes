# Plutonium Scenes

Scene data for Plutonium, which is automatically used by the Map Importer during import.

## Setup

```bash
npm i
```

## Contributing

- Import a scene using Plutonium's Map Importer
- Add/edit walls
- Export the scene (Right-click -> `Export Data` in Foundry)
- `npm run convert -- --file "path/to/fvtt-Scene-*.json" --type [adventure|book]`

## Local Testing

- `npm run serve:dev`
- Set your Plutonium Config "Import (Maps)" -> "Base Scene Repository URL" to `http://localhost:5002`
- Import map(s)
