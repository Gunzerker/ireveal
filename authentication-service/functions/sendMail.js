const nodemailer = require('nodemailer');
const env = require('../config/config.json');

module.exports = {
    sendEmail: function (destination,code) {
        // config
        // in real case those data would be parsed from env
        const config = {
            service: 'hotmail',
            auth: {
                user: env.EmailSecret,
                pass: env.EmailPassword
            } 
        }
        // mail_option
        const mail_options = {
            from: 'taha.hammemi@digit-u.com',
            to: destination,
            subject: 'iReveal',
            // text: 'this code will expire in one day, please reset your password within this time by this token :',
            html: 'this code will expire in one 3 minutes, please continue your signup within this time by this token '+code+' : <a href="http://localhost:3030/api/user/signup/'+code+'"> verify digit </a>',
        }
        // send
        return new Promise((resolve, reject) => {
            let transporter = nodemailer.createTransport(config)
            transporter.sendMail(mail_options, function (error, info) {
                if (error) {
                    reject(false)
                } else {
                    resolve(true)
                }
            })
        })
    }
}