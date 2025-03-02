/// <reference types="node" />
import Writable from 'node:stream'

/**
Creates a new spinner instance.

@returns A new spinner instance.

@example
```
import yoctoSpinner from 'yocto-spinner'

const spinner = yoctoSpinner({text: 'Loading…'}).start()

setTimeout(() => {
  spinner.success('Success!')
}, 2000)
```
*/
declare function yoctoSpinner(
  options?: yoctoSpinner.Options | undefined
): yoctoSpinner.Spinner
declare namespace yoctoSpinner {
  export type Color =
    | 'black'
    | 'blue'
    | 'cyan'
    | 'gray'
    | 'green'
    | 'magenta'
    | 'red'
    | 'white'
    | 'yellow'

  export type Options = {
    /**
    The color of the spinner.

    @default 'cyan'
    */
    readonly color?: Color | undefined

    /**
    Customize the spinner animation with a custom set of frames and interval.

    ```
    {
      frames: ['-', '\\', '|', '/'],
      interval: 100,
    }
    ```

    Pass in any spinner from [`cli-spinners`](https://github.com/sindresorhus/cli-spinners).
    */
    readonly spinner?: SpinnerStyle | undefined

    /**
    An AbortSignal that can be used to cancel the spinner animation.
    */
    readonly signal?: AbortSignal | undefined

    /**
    The stream to which the spinner is written.

    @default process.stderr
    */
    readonly stream?: Writable | undefined

    /**
    Text to display next to the spinner.

    @default ''
    */
    readonly text?: string | undefined
  }

  export type Spinner = {
    /**
    Change the spinner color.
    */
    color: Color

    /**
    Change the text displayed next to the spinner.

    @example
    ```
    spinner.text = 'New text'
    ```
    */
    text: string

    /**
    Returns whether the spinner is currently spinning.
    */
    get isSpinning(): boolean

    /**
    Clears the spinner.

    @returns The spinner instance.
    */
    clear(): Spinner

    /**
    Stops the spinner and displays an error symbol with the message.

    @param text - The error message to display.
    @returns The spinner instance.
    */
    error(text?: string | undefined): Spinner

    /**
    Stops the spinner and displays an info symbol with the message.

    @param text - The info message to display.
    @returns The spinner instance.
    */
    info(text?: string | undefined): Spinner

    /**
    Starts the spinner.

    Optionally, updates the text.

    @param text - The text to display next to the spinner.
    @returns The spinner instance.
    */
    start(text?: string | undefined): Spinner

    /**
    Stops the spinner.

    Optionally displays a final message.

    @param finalText - The final text to display after stopping the spinner.
    @returns The spinner instance.
    */
    stop(finalText?: string | undefined): Spinner

    /**
    Stops the spinner and displays a success symbol with the message.

    @param text - The success message to display.
    @returns The spinner instance.
    */
    success(text?: string | undefined): Spinner

    /**
    Stops the spinner and displays a warning symbol with the message.

    @param text - The warning message to display.
    @returns The spinner instance.
    */
    warning(text?: string | undefined): Spinner
  }

  export type SpinnerStyle = {
    readonly frames: string[]
    readonly interval?: number | undefined
  }
}
export = yoctoSpinner
