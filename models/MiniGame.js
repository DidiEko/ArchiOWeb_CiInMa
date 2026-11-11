import mongoose from 'mongoose';

const miniGameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    archivedAt: {
        type: Date,
        default: null
    }
});

export default mongoose.model('MiniGame', miniGameSchema);