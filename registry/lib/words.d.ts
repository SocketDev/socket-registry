declare function capitalize(word: string): string
declare function determineArticle(word: string): 'a' | 'an'
declare function pluralize(word: string, count?: number | undefined): string
declare const wordsModule: {
  capitalize: typeof capitalize
  determineArticle: typeof determineArticle
  pluralize: typeof pluralize
}
export = wordsModule
