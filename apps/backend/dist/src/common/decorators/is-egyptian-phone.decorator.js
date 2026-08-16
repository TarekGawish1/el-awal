"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsEgyptianPhone = IsEgyptianPhone;
const class_validator_1 = require("class-validator");
const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;
function IsEgyptianPhone(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isEgyptianPhone',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: `${propertyName} must be a valid Egyptian mobile phone number (e.g. 01012345678 or +201012345678)`,
                ...validationOptions,
            },
            validator: {
                validate(value, _args) {
                    return typeof value === 'string' && EGYPTIAN_PHONE_REGEX.test(value.trim());
                },
            },
        });
    };
}
//# sourceMappingURL=is-egyptian-phone.decorator.js.map