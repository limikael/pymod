import {spawn} from "child_process";
import path from "node:path";
import {fileURLToPath} from 'node:url';
import {createInterface} from "readline";
import {ResolvablePromise, awaitEvent} from "./js-util.js";
import {EventEmitter} from 'events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PythonModule extends EventEmitter {
	static instances=[];

	constructor(modulePath, {uv}={}) {
		super();

		this.uv=uv;
		this.nextCallId=1;
		this.modulePath=modulePath;
		this.callPromises={};
		PythonModule.instances.push(this);

		//this.stub={};
		this.proxy=new Proxy({},{
			get: (target, method, receiver)=>{
				if (method=="then")
					return undefined;

				if (["terminate","on","off"].includes(method))
					return this[method].bind(this);

				return ((...params)=>{
					return this.call(method,params);
				})
			}
		});
	}

	terminate=async ()=>{
		let closePromise=awaitEvent(this.process,"close");
		this.process.kill("SIGTERM");
		await closePromise;

		let index=PythonModule.instances.indexOf(this);
		if (index>=0)
			PythonModule.instances.splice(index,1);
	}

	handleLine=async line=>{
		let message=JSON.parse(line);
		switch (message.type) {
			case "callResult": {
				let callPromise=this.callPromises[message.id];
				delete this.callPromises[message.id];
				callPromise.resolve(message.result);
				break;
			}

			case "callError": {
				let callPromise=this.callPromises[message.id];
				delete this.callPromises[message.id];
				callPromise.reject(new Error(message.message));
				break;
			}

			case "event":
				this.emit(message.event,...message.args);
				break;

			case "start":
				this.startPromise.resolve();
				break;

			case "error":
				await this.terminate();
				this.startPromise.reject(new Error(message.message));
				break;

			default:
				throw new Error("Unknown message in js: "+JSON.stringify(message));
		}
	}

	async start() {
		if (this.process)
			throw new Error("Already started");

		this.startPromise=new ResolvablePromise();
		if (this.uv) {
			this.process=spawn("uv",["run","python",path.join(__dirname,"pymod.py"),this.modulePath],{
				stdio: ["ignore", "inherit", "inherit", "pipe", "pipe"], 
			});
		}

		else {
			this.process=spawn("python",[path.join(__dirname,"pymod.py"),this.modulePath],{
				stdio: ["ignore", "inherit", "inherit", "pipe", "pipe"], 
			});
		}

		this.controlIn=this.process.stdio[3];  // JS -> Python
		this.controlOut=this.process.stdio[4]; // Python -> JS
		this.controlOutReader=createInterface({input: this.controlOut});
		this.controlOutReader.on("line",this.handleLine);

		await this.startPromise;
		this.startPromise=null;
	}

	call(method, params) {
		let id=this.nextCallId;
		this.nextCallId++;
		this.callPromises[id]=new ResolvablePromise();
		let message={type: "call", id, method, params};
		this.controlIn.write(JSON.stringify(message));
		this.controlIn.write("\n");
		return this.callPromises[id];
	}

	static exitCleanup() {
		for (let instance of PythonModule.instances) {
			if (instance.process)
				instance.process.kill("SIGTERM");
		}

		PythonModule.instances=[];
	}
}

process.on("exit", ()=>PythonModule.exitCleanup("exit"));
process.on("SIGINT", ()=>PythonModule.exitCleanup("SIGINT"));
process.on("SIGTERM", ()=>PythonModule.exitCleanup("SIGTERM"));
process.on("uncaughtException", ()=>PythonModule.exitCleanup("uncaughtException"));

export async function importPython(modulePath, options={}) {
	let mod=new PythonModule(modulePath, options);
	await mod.start();

	return mod.proxy;
}