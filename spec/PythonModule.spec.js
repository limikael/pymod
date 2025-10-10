import {importPython, PythonModule} from "../src/PythonModule.js";

describe("PythonModule",()=>{
	it("works",async ()=>{
		let mod=await importPython("spec/mod.py");

		let oneMore=await mod.add_one(123);
		expect(oneMore).toEqual(124);

		await mod.terminate();
	});

	it("handles load errors",async ()=>{
		await expectAsync(importPython("spec/mod-doesnt-exist.py")).toBeRejectedWithError(/.*No such file or directory.*/);
	});

	it("handles async functions",async ()=>{
		let mod=await importPython("spec/mod.py");

		let oneMore=await mod.add_one_async(123);
		expect(oneMore).toEqual(124);

		await mod.terminate();
	});

	it("handles function errors",async ()=>{
		let mod=await importPython("spec/mod.py");

		await expectAsync(mod.raise_error()).toBeRejectedWithError("hello");

		await mod.terminate();
	});

	it("handles missing functions",async ()=>{
		let mod=await importPython("spec/mod.py");

		await expectAsync(mod.doesnt_exist()).toBeRejectedWithError("KeyError: 'doesnt_exist'");

		await mod.terminate();
	});

	it("handles events",async ()=>{
		let mod=await importPython("spec/mod.py");

		let eventVal;
		mod.on("myevent",val=>eventVal=val);

		await mod.trigger_event();

		await mod.terminate();
	});

	it("can be terminated",async ()=>{
		let mod=await importPython("spec/mod.py");

		await mod.terminate();

		expect(PythonModule.instances.length).toEqual(0);
	});
});
