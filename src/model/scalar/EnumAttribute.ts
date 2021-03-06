import {AttributeAdapter} from '../../rdbadapter';
import {IEnumAttribute} from '../../serialize';
import {EnumValue} from '../../types';
import {Attribute, IAttributeOptions} from '../Attribute';
import {ScalarAttribute} from './ScalarAttribute';

export interface IEnumAttributeOptions extends IAttributeOptions<AttributeAdapter> {
  values: EnumValue[];
  defaultValue?: string | number;
}

export class EnumAttribute extends ScalarAttribute {

  private readonly _values: EnumValue[];
  private readonly _defaultValue?: string | number;

  constructor(options: IEnumAttributeOptions) {
    super(options);
    this._values = options.values;
    this._defaultValue = options.defaultValue;
  }

  get values(): EnumValue[] {
    return this._values;
  }

  get defaultValue(): string | number | undefined {
    return this._defaultValue;
  }

  public static isType(type: Attribute): type is EnumAttribute {
    return type instanceof EnumAttribute;
  }

  inspectDataType(): string {
    return super.inspectDataType() + ' ' + JSON.stringify(this._values);
  }

  serialize(): IEnumAttribute {
    return {
      ...super.serialize(),
      values: this._values,
      defaultValue: this._defaultValue
    };
  }
}
