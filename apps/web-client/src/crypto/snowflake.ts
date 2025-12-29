export class SnowflakeGenerator {
    private readonly EPOCH: bigint
    private readonly WORKER_ID_BITS = 5n
    private readonly DATACENTER_ID_BITS = 5n
    private readonly SEQUENCE_BITS = 12n

    private readonly MAX_WORKER_ID = (1n << this.WORKER_ID_BITS) - 1n
    private readonly MAX_DATACENTER_ID = (1n << this.DATACENTER_ID_BITS) - 1n
    private readonly MAX_SEQUENCE = (1n << this.SEQUENCE_BITS) - 1n

    private readonly WORKER_ID_SHIFT = this.SEQUENCE_BITS
    private readonly DATACENTER_ID_SHIFT = this.SEQUENCE_BITS + this.WORKER_ID_BITS
    private readonly TIMESTAMP_LEFT_SHIFT = this.SEQUENCE_BITS + this.WORKER_ID_BITS + this.DATACENTER_ID_BITS

    private workerId: bigint
    private datacenterId: bigint
    private sequence: bigint = 0n
    private lastTimestamp: bigint = -1n

    public constructor(workerId?: number, datacenterId?: number, customEpoch = 1704067200000) {
        this.EPOCH = BigInt(customEpoch)

        this.workerId = workerId !== undefined ? BigInt(workerId) : this.generateRandomId(Number(this.MAX_WORKER_ID))
        this.datacenterId =
            datacenterId !== undefined ? BigInt(datacenterId) : this.generateRandomId(Number(this.MAX_DATACENTER_ID))

        if (this.workerId > this.MAX_WORKER_ID || this.workerId < 0n) {
            throw new Error(`Worker ID can't be greater than ${this.MAX_WORKER_ID} or less than 0`)
        }
        if (this.datacenterId > this.MAX_DATACENTER_ID || this.datacenterId < 0n) {
            throw new Error(`Datacenter ID can't be greater than ${this.MAX_DATACENTER_ID} or less than 0`)
        }
    }

    /**
     * Generate the next ID
     *
     * @returns string
     */
    public nextId(): string {
        let timestamp = this.currentTimestamp()

        // The clock moved backwards, we can't generate an ID
        if (timestamp < this.lastTimestamp) {
            throw new Error(
                `Clock moved backwards. Refusing to generate id for ${this.lastTimestamp - timestamp} milliseconds`
            )
        }

        // If the timestamp is the same as the last one, we need to wait for the next millisecond
        if (this.lastTimestamp === timestamp) {
            this.sequence = (this.sequence + 1n) & this.MAX_SEQUENCE
            if (this.sequence === 0n) {
                timestamp = this.tilNextMillis(this.lastTimestamp)
            }
        } else {
            this.sequence = 0n
        }

        this.lastTimestamp = timestamp

        const id =
            ((timestamp - this.EPOCH) << this.TIMESTAMP_LEFT_SHIFT) |
            (this.datacenterId << this.DATACENTER_ID_SHIFT) |
            (this.workerId << this.WORKER_ID_SHIFT) |
            this.sequence

        return id.toString()
    }

    private tilNextMillis(lastTimestamp: bigint): bigint {
        let timestamp = this.currentTimestamp()
        while (timestamp <= lastTimestamp) {
            timestamp = this.currentTimestamp()
        }

        return timestamp
    }

    private currentTimestamp(): bigint {
        return BigInt(Date.now())
    }

    private generateRandomId(max: number): bigint {
        const array = new Uint32Array(1)
        crypto.getRandomValues(array)
        return BigInt(array[0] % (max + 1))
    }
}

export const snowflake = new SnowflakeGenerator()
