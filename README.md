# pymod

Load python modules and call python functions directly from JavaScript.

`pymod` lets you import and call Python code seamlessly inside JavaScript. You can load any `.py` file and call its functions as if they were native JavaScript functions. It also supports communication from Python back to JavaScript via events.

## Installation

```bash
npm install pymod
```

## Usage

### Import a Python module

```js
import { importPython } from "pymod";

const mod = await importPython("mymod.py");

await mod.hello("World");
```

If your Python file (`mymod.py`) looks like this:

```python
def hello(name):
    print(f"Hello, {name}!")
    return f"Hello, {name}!"
```

Then calling `await mod.hello("World")` in JS will:
- Execute the Python function
- Print to the Python console
- Return "Hello, World!" to JavaScript

## Communication between JS and Python

You can also emit events or call JS functions from inside Python.

### Example

```js
import { importPython } from "pymod";

// Load Python module
const mod = await importPython("mymod.py");

// Listen for events emitted from Python
mod.on("tick", value => {
  console.log("Tick from Python:", value);
});

// Start the Python loop
await mod.start();
```

And in your Python file:

```python
def start():
    import time
    for i in range(3):
        emit("tick", i)
        time.sleep(1)
```

`emit()` is provided automatically inside the Python runtime by `pymod`, allowing the Python side to send messages back to JavaScript.

### Handle async results
Python functions that return a value will resolve to a Promise in JS.  
If the Python function yields or awaits, `pymod` will handle it transparently.

## API Reference

### `importPython(source): Promise<PythonModule>`
Loads a Python module from a file or string and returns a proxy object exposing its functions.

## Implementation Notes

- Each imported module runs in its own Python runtime instance.
- Communication is handled via an internal async message channel.
- The `emit()` function is injected into Python automatically — no import paths required.

