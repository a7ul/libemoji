export type Emoji = {
  group: string;
  subgroup: string;
  emoji: string;
  parsedEmoji: string;
  codePoints: number[];
  status: string;
  versionSince: number;
  cldrShortName: string;
};

export type EmojiJSON = {
  subTotals: Record<
    string,
    {
      withoutModifiers: number;
      withModifiers: number;
    }
  >;
  statusCounts: Record<string, number>;
  emojis: Emoji[];
};

export interface ParserMeta extends EmojiJSON {
  current: {
    groupName: string;
    subgroupName: string;
    mode: "emoji" | "command" | "status-count" | "end";
    lineNumber: number;
  };
}
