"use strict";
/**
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Attribute {
    constructor(name, lName, required, adapter) {
        this._calculated = false;
        this._name = name;
        this._lName = lName;
        this._required = required;
        this.adapter = adapter;
    }
    get name() {
        return this._name;
    }
    get lName() {
        return this._lName;
    }
    get required() {
        return this._required;
    }
    get calculated() {
        return this._calculated;
    }
}
exports.Attribute = Attribute;
class ScalarAttribute extends Attribute {
}
exports.ScalarAttribute = ScalarAttribute;
class StringAttribute extends ScalarAttribute {
    constructor(name, lName, required, minLength, maxLength, defaultValue, mask, adapter) {
        super(name, lName, required, adapter);
        this._autoTrim = true;
        this._minLength = minLength;
        this._maxLength = maxLength;
        this._defaultValue = defaultValue;
        this._mask = mask;
    }
}
exports.StringAttribute = StringAttribute;
class SequenceAttribute extends ScalarAttribute {
    constructor(name, lName, sequence, adapter) {
        super(name, lName, true, adapter);
        this._sequence = sequence;
    }
}
exports.SequenceAttribute = SequenceAttribute;
class NumberAttribute extends ScalarAttribute {
    constructor(name, lName, required, minValue, maxValue, defaultValue, adapter) {
        super(name, lName, required, adapter);
        this._minValue = minValue;
        this._maxValue = maxValue;
        this._defaultValue = defaultValue;
    }
    get minValue() {
        return this._minValue;
    }
    set minValue(value) {
        this._minValue = value;
    }
    get maxValue() {
        return this._maxValue;
    }
    set maxValue(value) {
        this._maxValue = value;
    }
    get defaultValue() {
        return this._defaultValue;
    }
    set defaultValue(value) {
        this._defaultValue = value;
    }
}
exports.NumberAttribute = NumberAttribute;
class IntegerAttribute extends NumberAttribute {
}
exports.IntegerAttribute = IntegerAttribute;
class FloatAttribute extends NumberAttribute {
}
exports.FloatAttribute = FloatAttribute;
class NumericAttribute extends NumberAttribute {
}
exports.NumericAttribute = NumericAttribute;
class DateAttribute extends NumberAttribute {
}
exports.DateAttribute = DateAttribute;
class TimeAttribute extends NumberAttribute {
}
exports.TimeAttribute = TimeAttribute;
class TimeStampAttribute extends NumberAttribute {
}
exports.TimeStampAttribute = TimeStampAttribute;
class BooleanAttribute extends ScalarAttribute {
    constructor(name, lName, required, defaultValue, adapter) {
        super(name, lName, required, adapter);
        this._defaultValue = defaultValue;
    }
}
exports.BooleanAttribute = BooleanAttribute;
class EnumAttribute extends ScalarAttribute {
}
exports.EnumAttribute = EnumAttribute;
class TimeIntervalAttribute extends ScalarAttribute {
}
exports.TimeIntervalAttribute = TimeIntervalAttribute;
class EntityAttribute extends Attribute {
    constructor(name, lName, required, entity, adapter) {
        super(name, lName, required, adapter);
        this._entity = entity;
    }
}
exports.EntityAttribute = EntityAttribute;
class ParentAttribute extends EntityAttribute {
    constructor(name, lName, entity, adapter) {
        super(name, lName, false, entity, adapter);
    }
}
exports.ParentAttribute = ParentAttribute;
class DetailAttribute extends EntityAttribute {
}
exports.DetailAttribute = DetailAttribute;
class SetAttribute extends EntityAttribute {
}
exports.SetAttribute = SetAttribute;
class Entity {
    constructor(parent, name, lName, isAbstract, adapter) {
        this._pk = [];
        this._attributes = {};
        this._unique = [];
        this.parent = parent;
        this.name = name;
        this.lName = lName;
        this.isAbstract = isAbstract;
        this.adapter = adapter;
    }
    get pk() {
        return this._pk;
    }
    get attributes() {
        return this._attributes;
    }
    get unique() {
        return this._unique;
    }
    addUnique(value) {
        this._unique.push(value);
    }
    attribute(name) {
        const found = this._attributes[name];
        if (!found) {
            throw new Error(`Unknown attribute ${name}`);
        }
        return found;
    }
    add(attribute) {
        if (this._attributes[attribute.name]) {
            throw new Error(`Attribute ${attribute.name} already exists`);
        }
        if (!this._pk.length) {
            this._pk.push(attribute);
        }
        return this._attributes[attribute.name] = attribute;
    }
}
exports.Entity = Entity;
class Sequence {
    constructor(name, adapter) {
        this._name = name;
        this._adapter = adapter;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value;
    }
}
exports.Sequence = Sequence;
class ERModel {
    constructor() {
        this._entities = {};
        this._sequencies = {};
    }
    get entities() {
        return this._entities;
    }
    entity(name) {
        const found = this._entities[name];
        if (!found) {
            throw new Error(`Unknown entity ${name}`);
        }
        return found;
    }
    add(entity) {
        if (this._entities[entity.name]) {
            throw new Error(`Entity ${entity.name} already exists`);
        }
        return this._entities[entity.name] = entity;
    }
    addSequence(sequence) {
        if (this._sequencies[sequence.name]) {
            throw new Error(`Sequence ${sequence.name} already exists`);
        }
        return this._sequencies[sequence.name] = sequence;
    }
}
exports.ERModel = ERModel;
//# sourceMappingURL=ermodel.js.map