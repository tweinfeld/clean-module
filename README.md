# clean-module

A CLI tool that recursively finds and deletes all `node_modules` directories under a given path (or the current directory).

## Usage

```sh
node clean.js [path]
```

- `path` — optional target directory (defaults to current working directory)

**Example:**

```sh
node clean.js ~/projects
```

This will scan `~/projects` for every `package.json`, then delete the adjacent `node_modules` folder (if it exists), up to 5 deletions in parallel.

## How it works

1. Streams all `package.json` files under the target path, skipping any inside `node_modules`.
2. For each found package, checks whether a sibling `node_modules` folder exists.
3. Deletes confirmed `node_modules` folders concurrently (max 5 at a time).
4. Logs each found package and each deletion to stdout, ending with `Done!`.

## Dependencies

| Package                                       | Purpose                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| [`glob`](https://github.com/isaacs/node-glob) | Stream-based file globbing                                       |
| [`kefir`](https://kefirjs.github.io/kefir/)   | Reactive streams / FRP                                           |
| [`lodash`](https://lodash.com/)               | Functional utilities (`fp/pipe`, `fp/partialRight`, `fp/always`) |

## Install

```sh
npm install
```

## License

ISC
