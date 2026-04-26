import clean from "./clean.js";
import { resolve } from "node:path";
import gui from "./gui.js";

const basePath = resolve(process.argv[2] ?? "");

clean(basePath).thru(gui);
