import fs from "fs";
import util from "util";
import path from "path";
import { parse } from "../parser";

const RAW_DIR = path.resolve(__dirname, "..", "..", "raw");
const EMOJI_UNICODE_IN_FILE = path.resolve(RAW_DIR, "emoji-test.txt");
const EMOJI_JSON_OUT_FILE = path.resolve(RAW_DIR, "emoji.json");

const fsRead = util.promisify(fs.readFile);
const fsWrite = util.promisify(fs.writeFile);

async function generateJson() {
  const content = await fsRead(EMOJI_UNICODE_IN_FILE, { encoding: "utf8" });
  const parserOutput = parse(content);
  const emojiJson = {
    emojis: parserOutput.emojis,
    statusCounts: parserOutput.statusCounts,
    subTotals: parserOutput.subTotals
  };
  await fsWrite(EMOJI_JSON_OUT_FILE, JSON.stringify(emojiJson));
}

console.time("GENERATE");
generateJson()
  .then(() => {
    console.timeEnd("GENERATE");
    console.log(`Output written at: ${EMOJI_JSON_OUT_FILE}`);
  })
  .catch(console.error);
