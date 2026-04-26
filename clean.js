import kefir from "kefir";
import { globStream } from "glob";
import { dirname, join } from "node:path";
import { access, constants, rm } from "node:fs";
import partialRight from "lodash/fp/partialRight.js";
import pipe from "lodash/fp/pipe.js";
import always from "lodash/fp/always.js";

const MAX_PARALLEL_DELETIONS = 5;

export const TYPE_DISCOVER = Symbol("Discover");
export const TYPE_DELETE = Symbol("Delete");
export const STATUS_START = Symbol("Start");
export const STATUS_FINISH = Symbol("Finish");

const fromNodeStream = function (nodeStream) {
  return kefir
    .fromEvents(nodeStream, "data")
    .takeUntilBy(kefir.fromEvents(nodeStream, "end").take(1));
};

export default function clean(basePath) {
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
      kefir.merge([
        kefir.constant({
          type: TYPE_DELETE,
          status: STATUS_START,
          folder: dirname,
        }),
        kefir
          .fromNodeCallback(
            rm.bind(null, dirname, {
              recursive: true,
              force: true,
            }),
          )
          .map(
            always({
              type: TYPE_DELETE,
              status: STATUS_FINISH,
              folder: dirname,
            }),
          ),
      ]),
    MAX_PARALLEL_DELETIONS,
  );

  return kefir.merge([
    packageJsonStream$.map((folder) => ({ type: TYPE_DISCOVER, folder })),
    deletionStream$,
  ]);
}
