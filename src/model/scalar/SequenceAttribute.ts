import {AttributeAdapter} from '../../rdbadapter';
import {ISequenceAttribute} from '../../serialize';
import {IBaseSemOptions} from '../../types';
import {Attribute} from '../Attribute';
import {Sequence} from '../Sequence';
import {ScalarAttribute} from './ScalarAttribute';

export interface ISequenceAttributeOptions<Adapter> extends IBaseSemOptions<Adapter> {
  sequence: Sequence;
}

export class SequenceAttribute extends ScalarAttribute<AttributeAdapter> {

  private readonly _sequence: Sequence;

  constructor(options: ISequenceAttributeOptions<AttributeAdapter>) {
    super({...options, required: true});
    this._sequence = options.sequence;
  }

  get sequence(): Sequence {
    return this._sequence;
  }

  public static isType(type: Attribute): type is SequenceAttribute {
    return type instanceof SequenceAttribute;
  }

  serialize(): ISequenceAttribute {
    return {
      ...super.serialize(),
      sequence: this._sequence.name
    };
  }
}
