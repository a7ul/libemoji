import fs from "fs";
import path from "path";
import util from "util";

const fsReadFile = util.promisify(fs.readFile);

const unicodeFilePath = path.resolve(
  __dirname,
  "..",
  "..",
  "raw",
  "emoji-test.txt"
);

async function readDataFile(): Promise<string> {
  const fileContents = await fsReadFile(unicodeFilePath, { encoding: "utf8" });
  return fileContents;
}

function trimHeaders(fileContents: string): string {
  // get position of first group
  const startPosition = fileContents.search("# group:");
  return fileContents.slice(startPosition);
}

type Emoji = {
  group: string;
  subgroup: string;
  emoji: string;
  parsedEmoji: string;
  codePoints: number[];
  status: string;
  versionSince: number;
  cldrShortName: string;
};

type Meta = {
  current: {
    groupName: string;
    subgroupName: string;
    mode: "emoji" | "command" | "status-count" | "end";
    lineNumber: number;
  };
  subtotals: Record<
    string,
    {
      withoutModifiers: number;
      withModifiers: number;
    }
  >;
  statusCounts: Record<string, number>;
  emojis: Emoji[];
};

const meta: Meta = {
  current: {
    groupName: "unknown",
    subgroupName: "unknown",
    mode: "command",
    lineNumber: 0
  },
  subtotals: {},
  statusCounts: {},
  emojis: []
};

function handleStatusCount(line: string) {
  const statusCountRegex = new RegExp(`# ([a-z-]+)([\t :]*)([0-9]+)`);
  const matches = line.match(statusCountRegex) as RegExpMatchArray;
  const groupName = String(matches[1]).trim();
  const count = parseInt(String(matches[3]).trim());
  meta.statusCounts[groupName] = count;
  return;
}

function handleCommand(line: string) {
  const subtotalWithoutModifiersRegex = new RegExp(
    `# (.*) subtotal:(["\t"," ",0-9]+)(w\/o modifiers)`
  );
  const subtotalRegex = new RegExp(`# (.*) subtotal:([\t 0-9]+)`);
  const groupIdentifier = "# group:";
  const subGroupIdentifier = "# subgroup:";
  const eofIdentifier = "#EOF";
  const statusCountIdentifier = "# Status Counts";

  if (line.startsWith(groupIdentifier)) {
    meta.current.subgroupName = "unknown";
    meta.current.groupName = line.replace(groupIdentifier, "").trim();
    return;
  }
  if (line.startsWith(subGroupIdentifier)) {
    meta.current.subgroupName = line.replace(subGroupIdentifier, "").trim();
    meta.current.mode = "emoji";
    return;
  }
  if (subtotalWithoutModifiersRegex.test(line)) {
    const matches = line.match(
      subtotalWithoutModifiersRegex
    ) as RegExpMatchArray;
    const groupName = String(matches[1]).trim();
    const count = parseInt(String(matches[2]).trim());
    meta.subtotals[groupName] = meta.subtotals[groupName] || {};
    meta.subtotals[groupName].withoutModifiers = count;
    return;
  }
  if (subtotalRegex.test(line)) {
    const matches = line.match(subtotalRegex) as RegExpMatchArray;
    const groupName = String(matches[1]).trim();
    const count = parseInt(String(matches[2]).trim());
    meta.subtotals[groupName] = meta.subtotals[groupName] || {};
    meta.subtotals[groupName].withModifiers = count;
    return;
  }

  if (line.startsWith(statusCountIdentifier)) {
    meta.current.mode = "status-count";
    return;
  }

  if (line.startsWith(eofIdentifier)) {
    return;
  }

  throw "Unknown Command: " + line;
}

function parseEmojiCodePoints(rawCodePoints: string): number[] {
  const codePoints = rawCodePoints.split(" ");
  return codePoints.map(eachCodePoint => {
    return parseInt(eachCodePoint, 16);
  });
}

function parseEmojiDesc(desc: string, entireLine: string) {
  const emojiDescRegex = new RegExp(`(.*)(E[0-9.]+)(.*)`);
  const matches = desc.match(emojiDescRegex);
  if (!matches) {
    throw new Error(
      `Line #${meta.current.lineNumber} after comment headers. Unknown emoji desc format:  ${entireLine}`
    );
  }
  const parsedEmoji = String(matches[1]).trim();
  const versionString = String(matches[2]).trim();
  const rawDescription = String(matches[3]).trim();

  return {
    parsedEmoji,
    versionString,
    rawDescription
  };
}

function parseEmojiLine(line: string): Emoji {
  // code points; status # emoji name
  const lineFormatRegex = new RegExp(`(.*);(.*)# (.*)`);
  if (lineFormatRegex.test(line) === false) {
    throw new Error("Unable to parse Emoji line: " + line);
  }
  const matches = line.match(lineFormatRegex) as RegExpMatchArray;
  const rawCodePoints = String(matches[1]).trim();
  const status = String(matches[2]).trim();
  const emojiDescRaw = String(matches[3]).trim();

  const codePoints = parseEmojiCodePoints(rawCodePoints);
  const emojiDesc = parseEmojiDesc(emojiDescRaw, line);
  const versionSince = parseFloat(emojiDesc.versionString.replace("E", ""));
  return {
    codePoints,
    status,
    subgroup: meta.current.subgroupName,
    group: meta.current.groupName,
    emoji: String.fromCodePoint(...codePoints),
    versionSince,
    cldrShortName: emojiDesc.rawDescription,
    parsedEmoji: emojiDesc.parsedEmoji
  };
}

function handleEmoji(line: string) {
  const emoji = parseEmojiLine(line);
  meta.emojis.push(emoji);
}

function parse(contents: string): any {
  const lines = contents.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    meta.current.lineNumber = i;
    const eachLine = lines[i];
    if (eachLine.length === 0) {
      meta.current.mode = "command";
      continue;
    }
    if (meta.current.mode === "command") {
      handleCommand(eachLine);
    } else if (meta.current.mode === "emoji") {
      handleEmoji(eachLine);
    } else if (meta.current.mode === "status-count") {
      handleStatusCount(eachLine);
    } else if (meta.current.mode === "end") {
      break;
    } else {
      throw new Error("Unknown mode" + meta.current.mode);
    }
  }

  return lines;
}

async function main() {
  const rawContent = await readDataFile();
  const mainContent = trimHeaders(rawContent);
  parse(mainContent);
  return meta;
}

main()
  .then(data => {
    console.log(data);
  })
  .catch(err => {
    console.log(err);
  });

setInterval(() => {}, 2000);
