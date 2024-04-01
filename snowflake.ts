const EPOCH = 1704067200000;
const SEQUENCE_BITS = 12;
const WORKER_ID_BITS = 5;
const DATA_CENTER_ID_BITS = 5;
const MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1;
const WORKER_ID_SHIFT = SEQUENCE_BITS;
const DATA_CENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATA_CENTER_ID_BITS;

const DATA_CENTER_ID = parseInt(Deno.env.get("DATA_CENTER_ID") ?? "1");
const WORKER_ID = parseInt(Deno.env.get("DATA_WORKER_ID") ?? "1");

let lastTimestamp = -1;
let sequence = 0;

const tilNextMillis = (lastTimestamp: number) => {
    let timestamp = Date.now();
    while (timestamp <= lastTimestamp) {
        timestamp = Date.now();
    }
    return timestamp;
}

const nextId = () => {
    let timestamp = Date.now();
    if (timestamp < lastTimestamp) {
        throw new Error('InvalidSystemClock');
    }
    if (timestamp === lastTimestamp) {
        sequence = (sequence + 1) & MAX_SEQUENCE;
        if (sequence === 0) {
            timestamp = tilNextMillis(lastTimestamp);
        }
    } else {
        sequence = 0;
    }
    lastTimestamp = timestamp;
    return BigInt(timestamp - EPOCH) << BigInt(TIMESTAMP_SHIFT)
        | BigInt((DATA_CENTER_ID << DATA_CENTER_ID_SHIFT))
        | BigInt((WORKER_ID << WORKER_ID_SHIFT))
        | BigInt(sequence);
}

export { nextId };
