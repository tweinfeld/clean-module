import kefir from "kefir";
import { createElement } from "react";
import { Box, render, Spacer, Text } from "ink";
import {
  STATUS_FINISH,
  STATUS_START,
  TYPE_DELETE,
  TYPE_DISCOVER,
} from "./clean.js";
import matchesProperty from "lodash/fp/matchesProperty.js";
import noop from "lodash/fp/noop.js";
import matches from "lodash/fp/matches.js";
import always from "lodash/fp/always.js";

const SECOND = 1000;
const REMOVE_AFTER_MS = 3 * SECOND;

const [text, box, spacer] = [Text, Box, Spacer].map(
  (Component) =>
    (props, children, ...fixedChildren) =>
      createElement(Component, props, children, ...fixedChildren),
);

const layout = ({ total = 0, deletions = {}, totalDeleted = 0 }) =>
  box(
    { flexDirection: "column", padding: 1, key: "root" },
    [],
    box(
      {
        key: "total",
        borderStyle: "single",
        paddingX: 1,
      },
      [],
      totalDeleted === null
        ? box(
            { key: "found" },
            [],
            text({}, `Found `),
            text({ color: "green" }, total),
            text({}, " npm package(s)"),
          )
        : text(
            { key: "deleted" },
            [],
            `Removed dependency folders from ${totalDeleted} npm package(s)`,
          ),
    ),
    totalDeleted === null
      ? box(
          { flexDirection: "column" },
          Object.entries(deletions).flatMap(([folder, { status, ts }]) =>
            status === STATUS_START ||
            (status === STATUS_FINISH && Date.now() - ts < REMOVE_AFTER_MS)
              ? [
                  box(
                    {
                      paddingX: 1,
                      borderStyle: false,
                      borderDimColor: true,
                      key: ["folder", folder].join("_"),
                    },
                    text({}, folder),
                    spacer({}),
                    status === STATUS_START
                      ? text({ color: "orange" }, "Deleting")
                      : text({ color: "green" }, "Done!"),
                  ),
                ]
              : [],
          ),
        )
      : null,
  );

export default function (progressStream) {
  const { rerender } = render();
  return kefir
    .combine(
      [
        progressStream
          .filter(matchesProperty("type", TYPE_DISCOVER))
          .scan((acc) => acc + 1, 0),
        progressStream.filter(matchesProperty("type", TYPE_DELETE)).scan(
          (acc, { folder, status }) => ({
            ...acc,
            [folder]: { status, ts: Date.now() },
          }),
          {},
        ),
        progressStream
          .filter(matches({ type: TYPE_DELETE, status: STATUS_FINISH }))
          .scan((ac) => ac + 1, 0)
          .last()
          .toProperty(always(null)),
        kefir.fromPoll(SECOND, noop).takeUntilBy(progressStream.last()),
      ],
      (total, deletions, totalDeleted) => ({
        total,
        totalDeleted,
        deletions,
      }),
    )
    .map(layout)
    .onValue(rerender);
}
