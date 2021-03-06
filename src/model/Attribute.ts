import {semCategories2Str, SemCategory} from 'gdmn-nlp';
import {AttributeClasses, IAttribute} from '../serialize';
import {IBaseSemOptions, LName} from '../types';

export interface IAttributeOptions<Adapter> extends IBaseSemOptions<Adapter> {
  required?: boolean;
}

export abstract class Attribute<Adapter = any> {

  protected _adapter?: Adapter;

  private readonly _name: string;
  private readonly _lName: LName;
  private readonly _required: boolean;
  private readonly _semCategories: SemCategory[];

  protected constructor(options: IAttributeOptions<Adapter>) {
    this._name = options.name;
    this._lName = options.lName;
    this._required = options.required || false;
    this._semCategories = options.semCategories || [];
    this._adapter = options.adapter;
  }

  get adapter(): Adapter | undefined {
    return this._adapter;
  }

  get name(): string {
    return this._name;
  }

  get lName(): LName {
    return this._lName;
  }

  get required(): boolean {
    return this._required;
  }

  get semCategories(): SemCategory[] {
    return this._semCategories;
  }

  serialize(): IAttribute {
    return {
      name: this.name,
      type: this.constructor.name as AttributeClasses,
      lName: this._lName,
      required: this._required,
      semCategories: semCategories2Str(this._semCategories)
    };
  }

  inspectDataType(): string {
    const sn = {
      'EntityAttribute': '->',
      'StringAttribute': 'S',
      'SetAttribute': '<->',
      'ParentAttribute': '-^',
      'SequenceAttribute': 'PK',
      'IntegerAttribute': 'I',
      'NumericAttribute': 'N',
      'FloatAttribute': 'F',
      'BooleanAttribute': 'B',
      'DateAttribute': 'DT',
      'TimeStampAttribute': 'TS',
      'TimeAttribute': 'TM',
      'BlobAttribute': 'BLOB',
      'EnumAttribute': 'E'
    } as { [name: string]: string };
    return sn[this.constructor.name] ? sn[this.constructor.name] : this.constructor.name;
  }

  inspect(indent: string = '    '): string[] {
    const adapter = this.adapter ? ', ' + JSON.stringify(this.adapter) : '';
    const lName = this.lName.ru ? ' - ' + this.lName.ru.name : '';
    const cat = this._semCategories.length ? `, categories: ${semCategories2Str(this._semCategories)}` : '';

    return [
      `${indent}${this._name}${this.required ? '*' : ''}${lName}: ${this.inspectDataType()}${cat}${adapter}`
    ];
  }
}
