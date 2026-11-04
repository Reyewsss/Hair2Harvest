import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = (res, user) => {
    // Accepts either a user document or a raw id.
    const userId = user?._id ?? user;
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d', // Token expires in 7 days
    });

    res.cookie('token', token, {
        httpOnly: true, // Cookie is not accessible via JavaScript
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict', // Prevent CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expires in 7 days
    });

return token;
};