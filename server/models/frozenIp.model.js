import mongoose from 'mongoose'

const frozenIpSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    reason: { type: String, default: 'Abnormal API activity detected' },
    hitCount: { type: Number, default: 0 },
    frozenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
}, { timestamps: true })

// auto-delete expired freeze records
frozenIpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const FrozenIpModel = mongoose.model('FrozenIp', frozenIpSchema)
export default FrozenIpModel
