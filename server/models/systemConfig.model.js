import mongoose from 'mongoose'

const systemConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, default: '' },
}, { timestamps: true })

const SystemConfigModel = mongoose.model('system_config', systemConfigSchema)
export default SystemConfigModel

