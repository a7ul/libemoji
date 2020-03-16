import { EmojiJSON } from "./parser/types";

const emojiJson: EmojiJSON = require("../raw/emoji.json");

export default emojiJson;
export * from "./parser/types";
