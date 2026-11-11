import mongoose from 'mongoose';

const { Schema } = mongoose;

const roundResultSchema = new Schema(
    {
        miniGame: {
            type: Schema.Types.ObjectId,
            ref: 'MiniGame',
            required: true
        },
        scores: [{
            _id: false,
            player: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            points: {
                type: Number,
                required: true,
                min: 0,
                validate: Number.isSafeInteger
            }
        }]
    },
    { _id: false }
);

const gameSchema = new Schema(
    {
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        players: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        miniGames: [{
            type: Schema.Types.ObjectId,
            ref: 'MiniGame'
        }],
        results: {
            type: [roundResultSchema],
            default: []
        },
        status: {
            type: String,
            enum: ['waiting', 'in_progress', 'finished'],
            default: 'waiting'
        }
    },
    { timestamps: true }
);

export default mongoose.model('Game', gameSchema);