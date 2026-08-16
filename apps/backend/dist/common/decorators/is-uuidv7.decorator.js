"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsUUIDv7 = IsUUIDv7;
const class_validator_1 = require("class-validator");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function IsUUIDv7(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isUUIDv7',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: `${propertyName} must be a valid UUID format`,
                ...validationOptions,
            },
            validator: {
                validate(value, _args) {
                    return typeof value === 'string' && UUID_REGEX.test(value);
                },
            },
        });
    };
}
//# sourceMappingURL=is-uuidv7.decorator.js.map