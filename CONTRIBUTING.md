# Contributing

Contributions are gratefully accepted.

See the [GitHub project](https://github.com/users/TheGiddyLimit/projects/1) for an overview of which sources are being worked on, and which are available to be worked on.

## Adding Maps

- Import a scene using Plutonium's Map Importer. ⚠ This should be the "DM" version of the scene, where possible, as "player" scene data is auto-generated from a linked DM scene. ⚠ 
- Add/edit walls
- Export the scene (Right-click -> `Export Data` in Foundry)
- `npm run convert -- --file "path/to/fvtt-Scene-*.json" --type [adventure|book]`

## Testing

- Serve the project's files locally by running `npm run serve:dev`
- Configure Plutonium's map importer to use your local server: set your "Import (Maps)" -> "Base Scene Repository URL" option to `http://localhost:5002`
- Import a map, and observe the created scene. Note that you may have to refresh between making changes to the project's files, as Plutonium aggressively caches loaded JSON.

## Getting Help

For any questions, ask in the [5etools Discord Server](https://discord.gg/5etools) `#plutonium-general` channel, or the `#plutonium-scenes` channel if you have access.
