import {AttributeAdapter} from '../../../rdbadapter';
import {Attribute} from '../../Attribute';
import {INumberAttributeOptions, NumberAttribute} from './NumberAttribute';

export class IntegerAttribute extends NumberAttribute<number> {

  constructor(options: INumberAttributeOptions<number, undefined, AttributeAdapter>) {
    super(options);
  }

  public static isType(type: Attribute): type is IntegerAttribute {
    return type instanceof IntegerAttribute;
  }
}
