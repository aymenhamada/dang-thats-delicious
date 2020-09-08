const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify')
const mail = require('../handlers/mail');


exports.login = passport.authenticate('local', {
    failureRedirect: 'login',
    failureFlash: 'Failed login !',
    successRedirect: '/',
    successFlash: 'You now logged in !'
})

exports.logout = async (req, res) => {
    req.logout();
    await req.flash('success', 'You are now logged out !');
    res.redirect('/');
}


exports.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated()){
        return next();
    }
    req.flash('error', 'You must be logged in');
    res.redirect('/login');
}














exports.forgot = async(req, res) => {
    const user = await User.findOne({email: req.body.email});
    if(!user){
        req.flash('error', 'No account with this email exists');
        return res.redirect('/login');
    }
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');//random token
    user.resetPasswordExpires = Date.now() + 3600000;// expires in 1Hour from NOW
    await user.save();

    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user,
        subject: 'Password reset !',
        resetURL,
        filename: 'password-reset',
    })
    await req.flash('success', `You have been emailed a password reset link`);
    res.redirect('/login');
}






exports.reset = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now()}
    })
    if(!user){
        req.flash('error', 'The token provided is invalid or expired');
        return res.redirect('/login');
    }

    res.render('reset', {title: 'Reset your password'});
}


exports.confirmPassword = (req, res, next) => {
    if(req.body.password == req.body['password-confirm']){
        return next();
    }
    req.flash('error', 'The 2 password provided is the not same');
    res.redirect('back');
}

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now()}// compare greater than, only take if it is greater than NOW
    })
    if(!user){
        await req.flash('error', 'The token provided is invalid or expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined; //undefined in mongodb delete the indexes data of the user.
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', 'Your password has been reset');
    res.redirect('/');
}