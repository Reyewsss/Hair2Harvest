import mongoose from 'mongoose';

// ----------------------------- User Schema --------------------------------------
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    verificationToken: String,
    verificationTokenExpires: Date,
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
// --------------------------------------------------------------------------------------
