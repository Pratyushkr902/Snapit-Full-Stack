import otpEmailTemplate from './otpEmailTemplate.js'

const forgotPasswordTemplate = ({ name, otp }) => {
    return otpEmailTemplate({
        otp,
        purpose: 'reset',
        name: name || 'Customer',
        expiryMinutes: 60
    })
}

export default forgotPasswordTemplate