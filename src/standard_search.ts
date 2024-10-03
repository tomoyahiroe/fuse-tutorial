import data from "./data.json"
const word = "lab"
const result = data.filter((obj) => {
  let isMatched = false
  isMatched = obj.title.includes(word)
  isMatched = obj.titleEnglish.includes(word)
  isMatched = obj.tags.includes(word)
  return isMatched
})

console.log(result)
