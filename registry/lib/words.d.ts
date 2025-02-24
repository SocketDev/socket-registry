declare const Words: {
  capitalize(word: string): string
  determineArticle(word: string): 'a' | 'an'
  pluralize(word: string, count?: number | undefined): string
}
declare namespace Words {}
export = Words
