/// <reference types="node" />
import { Writable } from 'node:stream'

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
  options?: yoctoSpinner.Options | undefined,
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

  export type ColorRgb = readonly [number, number, number]

  export type Options = {
    /**
    The color of the spinner.

    Can be a color name or an RGB tuple.

    @default 'cyan'
    */
    readonly color?: Color | ColorRgb | undefined

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

    /**
    Callback function called whenever the spinner advances to a new frame.
    Useful for synchronizing animations or updating related state.
    */
    readonly onFrameUpdate?: (() => void) | undefined

    /**
    Callback function to customize how the frame and text are combined.
    Provides full control over spacing and layout.

    @param frame - The current spinner frame string (with ANSI codes).
    @param text - The text to display next to the spinner.
    @param applyColor - Function to apply the spinner color to a string.
    @returns The formatted string to display (frame + text + spacing).

    @example
    ```
    onRenderFrame: (frame, text, applyColor) => {
      // Calculate frame width and adjust spacing accordingly
      const width = calculateWidth(frame)
      const spacing = width === 1 ? '  ' : ' '
      return `${applyColor(frame)}${spacing}${text}`
    }
    ```
    */
    readonly onRenderFrame?:
      | ((
          frame: string,
          text: string,
          applyColor: (text: string) => string,
        ) => string)
      | undefined
  }

  export type Spinner = {
    /**
    Change the spinner color.

    Can be a color name or an RGB tuple.
    */
    color: Color | ColorRgb

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
    Decrements spinner indentation by number of spaces.

    @param [spaces=2] - The number of spaces to dedent.
    @returns The spinner instance.
    */
    dedent(spaces?: number | undefined): Spinner

    /**
    Stops the spinner and displays an error symbol with the message.

    @param text - The error message to display.
    @returns The spinner instance.
    */
    error(text?: string | undefined): Spinner

    /**
    Increments spinner indentation by number of spaces.

    @param [spaces=2] - The number of spaces to indent.
    @returns The spinner instance.
    */
    indent(spaces?: number | undefined): Spinner

    /**
    Stops the spinner and displays an info symbol with the message.

    @param text - The info message to display.
    @returns The spinner instance.
    */
    info(text?: string | undefined): Spinner

    /**
    Resets spinner indentation to 0 spaces.

    @returns The spinner instance.
    */
    resetIndent(): Spinner

    /**
    Change the spinner style.
    */
    spinner: SpinnerStyle

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
