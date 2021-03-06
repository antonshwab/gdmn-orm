import { AttributeAdapter } from '../../../rdbadapter';
import { IDateAttribute } from '../../../serialize';
import { ContextVariables } from '../../../types';
import { Attribute } from '../../Attribute';
import { INumberAttributeOptions, NumberAttribute } from './NumberAttribute';
export declare class TimeStampAttribute extends NumberAttribute<Date, ContextVariables> {
    constructor(options: INumberAttributeOptions<Date, ContextVariables, AttributeAdapter>);
    static isType(type: Attribute): type is TimeStampAttribute;
    serialize(): IDateAttribute;
}
