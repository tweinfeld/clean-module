import kefir from "kefir";
import { globStream } from "glob";
import { dirname, join, resolve } from "node:path";
import { access, constants, rm } from "node:fs";
import process from "node:process";
import partialRight from "lodash/fp/partialRight.js";
import pipe from "lodash/fp/pipe.js";
import always from "lodash/fp/always.js";

const MAX_PARALLEL_DELETIONS = 5;

const basePath = resolve(process.argv[2] ?? "");

const fromNodeStream = function (stream) {
  return kefir
    .fromEvents(stream, "data")
    .takeUntilBy(kefir.fromEvents(stream, "end").take(1));
};

const packageJsonStream$ = fromNodeStream(
  globStream("**/package.json", {
    noDir: true,
    absolute: true,
    cwd: basePath,
    ignore: ["**/node_modules/**"],
  }),
);

const deletionFolderStream$ = packageJsonStream$
  .map(pipe(dirname, partialRight(join, ["node_modules"])))
  .flatMap((dirname) =>
    kefir
      .fromNodeCallback(access.bind(null, dirname, constants.F_OK))
      .map(always(dirname)),
  )
  .ignoreErrors();

const deletionStream$ = deletionFolderStream$.flatMapConcurLimit(
  (dirname) =>
    kefir
      .fromNodeCallback(
        rm.bind(null, dirname, {
          recursive: true,
          force: true,
        }),
      )
      .map(always(dirname)),
  MAX_PARALLEL_DELETIONS,
);

kefir
  .merge([
    packageJsonStream$.map(
      (packageFolder) => `Found package at "${packageFolder}"`,
    ),
    deletionStream$.map(
      (packageFolder) => `Removed package at "${packageFolder}"`,
    ),
  ])
  .flatMapErrors((err) => kefir.constant(`Error: ${err}`))
  .beforeEnd(always(`Done!`))
  .onValue(console.log);
