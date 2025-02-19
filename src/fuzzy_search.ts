import Fuse from "fuse.js";
import data from "./data.json"

const options = {
  keys: ['title', 'titleEnglish', 'tags'],
  threshold: 0.4,
  minMatchCharLength: 2
}
const optionsNoTags = {
  keys: ['title', 'titleEnglish'],
  threshold: 0.4,
  minMatchCharLength: 2
}
const optionsOnlyTags = {
  keys: ["tags"],
  threshold: 0.4,
  minMatchCharLength: 2
}
const fuse = new Fuse(data, options);
const fuseNoTags = new Fuse(data, optionsNoTags);
const fuseOnlyTags = new Fuse(data, optionsOnlyTags);

const word: string = process.argv[2]

const result = fuse.search(word);
const resultNoTags = fuseNoTags.search(word);
const resultOnlyTags = fuseOnlyTags.search(word);
console.log("tagsあり", result, result.length)
console.log("tagsなし", resultNoTags, resultNoTags.length)
console.log("tagsだけ", resultOnlyTags, resultOnlyTags.length)
