def add_one(v):
	return v+1

async def add_one_async(v):
	return v+1

def raise_error():
	raise Exception("hello")

def trigger_event():
	emit("myevent","helloevent")

def hello():
	return 123
