import {semCategories2Str, SemCategory} from 'gdmn-nlp';
import {EntityAdapter, relationName2Adapter} from '../rdbadapter';
import {IEntity} from '../serialize';
import {IBaseSemOptions, LName} from '../types';
import {Attribute} from './Attribute';

export interface Attributes {
  [name: string]: Attribute
}

export interface IEntityOptions extends IBaseSemOptions<EntityAdapter> {
  parent?: Entity;
  isAbstract?: boolean;
}

export class Entity {

  private readonly _parent?: Entity;
  private readonly _name: string;
  private readonly _lName: LName;
  private readonly _isAbstract: boolean;
  private readonly _semCategories: SemCategory[];
  private readonly _adapter?: EntityAdapter;

  private readonly _pk: Attribute[] = [];
  private readonly _attributes: Attributes = {};
  private readonly _unique: Attribute[][] = [];

  constructor(options: IEntityOptions) {
    /*
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error(`Invalid entity name ${name}`);
    }
    */

    this._parent = options.parent || undefined;
    this._name = options.name;
    this._lName = options.lName;
    this._isAbstract = options.isAbstract || false;
    this._semCategories = options.semCategories || [];
    this._adapter = options.adapter;
  }

  get pk(): Attribute[] {
    return this._pk;
  }

  get parent(): Entity | undefined {
    return this._parent;
  }

  get lName(): LName {
    return this._lName;
  }

  get name(): string {
    return this._name;
  }

  get isAbstract(): boolean {
    return this._isAbstract;
  }

  get adapter(): EntityAdapter {
    if (this._adapter) {
      return this._adapter;
    } else {
      return relationName2Adapter(this._name);
    }
  }

  get unique(): Attribute[][] {
    return this._unique;
  }

  get attributes(): Attributes {
    if (this._parent) {
      return {...this._parent.attributes, ...this._attributes};
    } else {
      return this._attributes;
    }
  }

  get semCategories(): SemCategory[] {
    return this._semCategories;
  }

  get isTree(): boolean {
    return this.hasAttribute('PARENT');
  }

  addUnique(value: Attribute[]): void {
    this._unique.push(value);
  }

  hasAttribute(name: string): boolean {
    return (this._parent && this._parent.hasAttribute(name)) || !!this._attributes[name];
  }

  hasOwnAttribute(name: string): boolean {
    return !!this._attributes[name];
  }

  attribute(name: string): Attribute | never {
    let found = this._attributes[name];
    if (!found && this._parent) {
      found = this._parent.attribute(name);
    }
    if (!found) {
      throw new Error(`Unknown attribute ${name} of entity ${this._name}`);
    }
    return found;
  }

  attributesBySemCategory(cat: SemCategory): Attribute[] {
    const attrArr = Object.entries(this._attributes).map(([, attr]) => attr);
    return attrArr.filter(attr => attr.semCategories.some(c => c === cat));
  }

  add(attribute: Attribute): Attribute | never {
    if (this._attributes[attribute.name]) {
      throw new Error(`Attribute ${attribute.name} of entity ${this._name} already exists`);
    }

    if (!this._pk.length && !this._parent) {
      this._pk.push(attribute);
    }

    return this._attributes[attribute.name] = attribute;
  }

  hasAncestor(a: Entity): boolean {
    return this._parent ? (this._parent === a ? true : this._parent.hasAncestor(a)) : false;
  }

  serialize(): IEntity {
    return {
      parent: this._parent ? this._parent._name : undefined,
      name: this._name,
      lName: this._lName,
      isAbstract: this._isAbstract,
      semCategories: semCategories2Str(this._semCategories),
      attributes: Object.entries(this.attributes).map(a => a[1].serialize())
    };
  }

  inspect(): string[] {
    const lName = this._lName.ru ? ' - ' + this._lName.ru.name : '';
    const result = [
      `${this._isAbstract ? '!' : ''}${this._name}${this._parent ? '(' + this._parent._name + ')' : ''}${lName}:`,
      `  adapter: ${JSON.stringify(this.adapter)}`,
      '  Attributes:',
      ...Object.entries(this.attributes).reduce((p, a) => {
        return [...p, ...a[1].inspect()];
      }, [] as string[])
    ];
    if (this._semCategories.length) {
      result.splice(1, 0, `  categories: ${semCategories2Str(this._semCategories)}`);
    }
    return result;
  }
}
