import asyncio
import inspect
import os
import sys
import importlib.util
import json
import builtins

async def line_reader(fd, callback):
    loop=asyncio.get_running_loop()
    reader=asyncio.StreamReader()
    protocol=asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, os.fdopen(fd))
    while line := await reader.readline():
        callback(line.decode().rstrip())

def load_module_from_file(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

class ModuleRunner:
    async def handleMessage(self, message):
        if message["type"]=="call":
            try:
                result=self.mod.__dict__[message["method"]](*message["params"])
                if inspect.isawaitable(result):
                    result=await result

                self.send({
                    "type": "callResult",
                    "id": message["id"],
                    "result": result
                })

            except Exception as e:
                errorMessage=str(e)
                if type(e).__name__!="Exception":
                    errorMessage=f"{type(e).__name__}: {e}"

                self.send({
                    "type": "callError",
                    "id": message["id"],
                    "message": errorMessage
                })

        else:
            print("received unknown message")

    def handleLine(self, line):
        #print("got line in python:",line)
        message=json.loads(line)
        asyncio.create_task(self.handleMessage(message))

    def send(self, message):
        self.wfd.write(json.dumps(message)+"\n")
        self.wfd.flush()

    def emit(self, event, *args):
        self.send({
            "type": "event",
            "event": event,
            "args": args
        })

    async def run(self):
        try:
            self.wfd=os.fdopen(4, "w")
            module_path=sys.argv[1]
            #print("loading module: "+module_path)
            self.mod=load_module_from_file("pymod",module_path)
            asyncio.create_task(line_reader(3,self.handleLine))
            builtins.emit=self.emit
            self.send({
                "type": "start"
            })

        except Exception as e:
            self.send({
                "type": "error",
                "message": str(e)
            })

        # loop forever
        await asyncio.Event().wait()

if __name__ == "__main__":
    module_runner=ModuleRunner()
    asyncio.run(module_runner.run())