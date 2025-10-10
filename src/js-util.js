export class ResolvablePromise extends Promise {
    constructor(cb = () => {}) {
        let resolveClosure = null;
        let rejectClosure = null;

        super((resolve,reject)=>{
            resolveClosure = resolve;
            rejectClosure = reject;

            return cb(resolve, reject);
        });

        this.resolveClosure = resolveClosure;
        this.rejectClosure = rejectClosure;
    }

    resolve=(result)=>{
        this.resolveClosure(result);
    }

    reject=(reason)=>{
        this.rejectClosure(reason);
    }
}

export function awaitEvent(eventTarget, type, predicate) {
    return new Promise((resolve, reject)=>{
        function eventHandler(event) {
            if (!predicate || predicate(event)) {
                eventTarget.off(type,eventHandler);
                resolve(event);
            }
        }

        eventTarget.on(type,eventHandler);
    });
}
