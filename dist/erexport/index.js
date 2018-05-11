"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
const erm = __importStar(require("../ermodel"));
const rdbadapter = __importStar(require("../rdbadapter"));
const atdata_1 = require("./atdata");
const util_1 = require("./util");
const document_1 = require("./document");
const gdtables_1 = require("./gdtables");
const gddomains_1 = require("./gddomains");
async function erExport(dbs, connection, transaction, erModel) {
    const { atfields, atrelations } = await atdata_1.load(connection, transaction);
    const crossRelationsAdapters = {
        'GD_CONTACTLIST': {
            owner: 'GD_CONTACT',
            selector: {
                field: 'CONTACTTYPE',
                value: 1
            }
        }
    };
    const abstractBaseRelations = {
        'GD_CONTACT': true
    };
    /**
     * Если имя генератора совпадает с именем объекта в БД, то адаптер можем не указывать.
     */
    const GDGUnique = erModel.addSequence(new erm.Sequence('GD_G_UNIQUE'));
    const GDGOffset = erModel.addSequence(new erm.Sequence('Offset', { sequence: 'GD_G_OFFSET' }));
    function findEntities(relationName, selectors = []) {
        const found = Object.entries(erModel.entities).reduce((p, e) => {
            if (e[1].adapter) {
                e[1].adapter.relation.forEach(r => {
                    if (r.relationName === relationName && !r.weak) {
                        if (r.selector && selectors.length) {
                            if (selectors.find(s => s.field === r.selector.field && s.value === r.selector.value)) {
                                p.push(e[1]);
                            }
                        }
                        else {
                            p.push(e[1]);
                        }
                    }
                });
            }
            return p;
        }, []);
        while (found.length) {
            const descendant = found.findIndex(d => !!found.find(a => a !== d && d.hasAncestor(a)));
            if (descendant === -1)
                break;
            found.splice(descendant, 1);
        }
        return found;
    }
    function createEntity(parent, adapter, abstract, entityName, lName, attributes) {
        if (!abstract) {
            const found = Object.entries(erModel.entities).find(e => !e[1].isAbstract && rdbadapter.sameAdapter(adapter, e[1].adapter));
            if (found) {
                return found[1];
            }
        }
        const relation = adapter.relation.filter(r => !r.weak).reverse()[0];
        if (!relation || !relation.relationName) {
            throw new Error('Invalid entity adapter');
        }
        const setEntityName = rdbadapter.adjustName(entityName ? entityName : relation.relationName);
        const atRelation = atrelations[relation.relationName];
        const fake = rdbadapter.relationName2Adapter(setEntityName);
        const entity = new erm.Entity(parent, setEntityName, lName ? lName : (atRelation ? atRelation.lName : {}), !!abstract, JSON.stringify(adapter) !== JSON.stringify(fake) ? adapter : undefined);
        if (!parent) {
            entity.add(new erm.SequenceAttribute('ID', { ru: { name: 'Идентификатор' } }, GDGUnique));
        }
        ;
        if (attributes) {
            attributes.forEach(attr => entity.add(attr));
        }
        return erModel.add(entity);
    }
    ;
    /**
     * Простейший случай таблицы. Никаких ссылок.
     */
    createEntity(undefined, rdbadapter.relationName2Adapter('WG_HOLIDAY'));
    /**
     * Административно-территориальная единица.
     * Тут исключительно для иллюстрации типа данных Перечисление.
     */
    createEntity(undefined, rdbadapter.relationName2Adapter('GD_PLACE'), false, undefined, undefined, [
        new erm.EnumAttribute('PLACETYPE', { ru: { name: 'Тип' } }, true, [
            {
                value: 'Область'
            },
            {
                value: 'Район'
            },
        ], 'Область')
    ]);
    /**
     * Папка из справочника контактов.
     * Основывается на таблице GD_CONTACT, но использует только несколько полей из нее.
     * Записи имеют признак CONTACTTYPE = 0.
     * Имеет древовидную структуру.
     */
    const Folder = createEntity(undefined, {
        relation: [{
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 0,
                },
                fields: [
                    'PARENT',
                    'NAME'
                ]
            }]
    }, false, 'Folder', { ru: { name: 'Папка' } });
    Folder.add(new erm.ParentAttribute('PARENT', { ru: { name: 'Входит в папку' } }, [Folder]));
    /**
     * Компания хранится в трех таблицах.
     * Две обязательные GD_CONTACT - GD_COMPANY. В адаптере они указываются
     * в массиве relation и соединяются в запросе оператором JOIN.
     * Первой указывается главная таблица. Остальные таблицы называются
     * дополнительными. Первичный ключ дополнительной таблицы
     * должен одновременно являться внешним ключем на главную.
     * Третья -- GD_COMPANYCODE -- необязательная. Подключается через LEFT JOIN.
     * Для атрибутов из главной таблицы можно не указывать адаптер, если их имя
     * совпадает с именем поля.
     * Флаг refresh означает, что после вставки/изменения записи ее надо перечитать.
     */
    const Company = createEntity(undefined, {
        relation: [
            {
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 3
                }
            },
            {
                relationName: 'GD_COMPANY'
            },
            {
                relationName: 'GD_COMPANYCODE',
                weak: true
            }
        ],
        refresh: true
    }, false, 'Company', { ru: { name: 'Организация' } }, [
        new erm.ParentAttribute('PARENT', { ru: { name: 'Входит в папку' } }, [Folder]),
        new erm.StringAttribute('NAME', { ru: { name: 'Краткое наименование' } }, true, undefined, 60, undefined, true, undefined)
    ]);
    const OurCompany = createEntity(Company, {
        relation: [
            {
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 3
                }
            },
            {
                relationName: 'GD_COMPANY'
            },
            {
                relationName: 'GD_COMPANYCODE',
                weak: true
            },
            {
                relationName: 'GD_OURCOMPANY'
            }
        ],
        refresh: true
    }, false, 'OurCompany', { ru: { name: 'Рабочая организация' } });
    /**
     * Банк является частным случаем компании (наследуется от компании).
     * Все атрибуты компании являются и атрибутами банка и не нуждаются
     * в повторном определении, за тем исключением, если мы хотим что-то
     * поменять в параметрах атрибута.
     */
    const Bank = createEntity(Company, {
        relation: [
            {
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 5
                }
            },
            {
                relationName: 'GD_COMPANY'
            },
            {
                relationName: 'GD_COMPANYCODE',
                weak: true
            },
            {
                relationName: 'GD_BANK'
            }
        ],
        refresh: true
    }, false, 'Bank', { ru: { name: 'Банк' } });
    /**
     * Подразделение организации может входить (через поле Parent) в
     * организацию (компания, банк) или в другое подразделение.
     */
    const Department = createEntity(undefined, {
        relation: [{
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 4
                }
            }]
    }, false, 'Department', { ru: { name: 'Подразделение' } });
    Department.add(new erm.ParentAttribute('PARENT', { ru: { name: 'Входит в организацию (подразделение)' } }, [Company, Department]));
    Department.add(new erm.StringAttribute('NAME', { ru: { name: 'Наименование' } }, true, undefined, 60, undefined, true, undefined));
    /**
     * Физическое лицо хранится в двух таблицах GD_CONTACT - GD_PEOPLE.
     */
    const Person = createEntity(undefined, {
        relation: [
            {
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 2
                }
            },
            {
                relationName: 'GD_PEOPLE'
            }
        ],
        refresh: true
    }, false, 'Person', { ru: { name: 'Физическое лицо' } });
    Person.add(new erm.ParentAttribute('PARENT', { ru: { name: 'Входит в папку' } }, [Folder]));
    Person.add(new erm.StringAttribute('NAME', { ru: { name: 'ФИО' } }, true, undefined, 60, undefined, true, undefined));
    /**
     * Сотрудник, частный случай физического лица.
     * Добавляется таблица GD_EMPLOYEE.
     */
    const Employee = createEntity(Person, {
        relation: [
            {
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 2
                }
            },
            {
                relationName: 'GD_PEOPLE'
            },
            {
                relationName: 'GD_EMPLOYEE'
            }
        ]
    }, false, 'Employee', { ru: { name: 'Сотрудник предприятия' } });
    Employee.add(new erm.ParentAttribute('PARENT', { ru: { name: 'Организация или подразделение' } }, [Company, Department]));
    /**
     * Группа контактов.
     * CONTACTLIST -- множество, которое хранится в кросс-таблице.
     */
    const Group = createEntity(undefined, {
        relation: [{
                relationName: 'GD_CONTACT',
                selector: {
                    field: 'CONTACTTYPE',
                    value: 1
                },
                fields: [
                    'PARENT',
                    'NAME'
                ]
            }]
    }, false, 'Group', { ru: { name: 'Группа' } });
    Group.add(new erm.ParentAttribute('PARENT', { ru: { name: 'Входит в папку' } }, [Folder]));
    const ContactList = Group.add(new erm.SetAttribute('CONTACTLIST', { ru: { name: 'Контакты' } }, false, [Company, Person], 0, {
        crossRelation: 'GD_CONTACTLIST'
    }));
    const companyAccount = createEntity(undefined, rdbadapter.relationName2Adapter('GD_COMPANYACCOUNT'));
    Company.add(new erm.DetailAttribute('GD_COMPANYACCOUNT', { ru: { name: 'Банковские счета' } }, false, [companyAccount]));
    gdtables_1.gedeminTables.forEach(t => createEntity(undefined, rdbadapter.relationName2Adapter(t)));
    createEntity(undefined, rdbadapter.relationName2Adapter('INV_CARD'));
    const TgdcDocument = createEntity(undefined, rdbadapter.relationName2Adapter('GD_DOCUMENT'), true, 'TgdcDocument');
    const TgdcDocumentAdapter = rdbadapter.relationName2Adapter('GD_DOCUMENT');
    const documentABC = {
        'TgdcDocumentType': TgdcDocument,
        'TgdcUserDocumentType': createEntity(TgdcDocument, TgdcDocumentAdapter, true, 'TgdcUserDocument', { ru: { name: 'Пользовательские документы' } }),
        'TgdcInvDocumentType': createEntity(TgdcDocument, TgdcDocumentAdapter, true, 'TgdcInvDocument', { ru: { name: 'Складские документы' } }),
        'TgdcInvPriceListType': createEntity(TgdcDocument, TgdcDocumentAdapter, true, 'TgdcInvPriceList', { ru: { name: 'Прайс-листы' } })
    };
    const documentClasses = {};
    function createDocument(id, ruid, parent_ruid, name, className, hr, lr) {
        const setHR = hr ? hr
            : id === 800300 ? 'BN_BANKSTATEMENT'
                : id === 800350 ? 'BN_BANKCATALOGUE'
                    : '';
        const setLR = lr ? lr
            : id === 800300 ? 'BN_BANKSTATEMENTLINE'
                : id === 800350 ? 'BN_BANKCATALOGUELINE'
                    : '';
        const parent = documentClasses[parent_ruid] && documentClasses[parent_ruid].header ? documentClasses[parent_ruid].header
            : documentABC[className] ? documentABC[className]
                : TgdcDocument;
        if (!parent) {
            throw new Error(`Unknown doc type ${parent_ruid} of ${className}`);
        }
        const headerAdapter = rdbadapter.appendAdapter(parent.adapter, setHR);
        headerAdapter.relation[0].selector = { field: 'DOCUMENTTYPEKEY', value: id };
        const header = createEntity(parent, headerAdapter, false, `DOC_${ruid}_${setHR}`, { ru: { name } });
        documentClasses[ruid] = { header };
        if (setLR) {
            const lineParent = documentClasses[parent_ruid] && documentClasses[parent_ruid].line ? documentClasses[parent_ruid].line
                : documentABC[className] ? documentABC[className]
                    : TgdcDocument;
            if (!lineParent) {
                throw new Error(`Unknown doc type ${parent_ruid} of ${className}`);
            }
            const lineAdapter = rdbadapter.appendAdapter(lineParent.adapter, setLR);
            lineAdapter.relation[0].selector = { field: 'DOCUMENTTYPEKEY', value: id };
            const line = createEntity(lineParent, lineAdapter, false, `LINE_${ruid}_${setLR}`, { ru: { name: `Позиция: ${name}` } });
            line.add(new erm.ParentAttribute('PARENT', { ru: { name: 'Шапка документа' } }, [header]));
            documentClasses[ruid] = Object.assign({}, documentClasses[ruid], { line });
            header.add(new erm.DetailAttribute(line.name, line.lName, false, [line]));
        }
    }
    ;
    await document_1.loadDocument(connection, transaction, createDocument);
    function recursInherited(parentRelation, parentEntity) {
        dbs.forEachRelation(inherited => {
            if (Object.entries(inherited.foreignKeys).find(([name, f]) => f.fields.join() === inherited.primaryKey.fields.join()
                && dbs.relationByUqConstraint(f.constNameUq) === parentRelation[parentRelation.length - 1])) {
                const newParent = [...parentRelation, inherited];
                const parentAdapter = parentEntity ? parentEntity.adapter
                    : rdbadapter.relationNames2Adapter(parentRelation.map(p => p.name));
                recursInherited(newParent, createEntity(parentEntity, rdbadapter.appendAdapter(parentAdapter, inherited.name), false, inherited.name, atrelations[inherited.name] ? atrelations[inherited.name].lName : {}));
            }
        }, true);
    }
    ;
    dbs.forEachRelation(r => {
        if (r.primaryKey.fields.join() === 'ID' && /^USR\$.+$/.test(r.name)
            && !Object.entries(r.foreignKeys).find(fk => fk[1].fields.join() === 'ID')) {
            if (abstractBaseRelations[r.name]) {
                recursInherited([r]);
            }
            else {
                recursInherited([r], createEntity(undefined, rdbadapter.relationName2Adapter(r.name)));
            }
        }
    }, true);
    function createAttribute(r, rf, atRelationField, attrName, adapter) {
        const attributeName = rdbadapter.adjustName(attrName);
        const atField = atfields[rf.fieldSource];
        const fieldSource = dbs.fields[rf.fieldSource];
        const required = rf.notNull || fieldSource.notNull;
        const defaultValue = rf.defaultValue || fieldSource.defaultValue;
        const lName = atRelationField ? atRelationField.lName : (atField ? atField.lName : {});
        const createDomainFunc = gddomains_1.gdDomains[rf.fieldSource];
        if (createDomainFunc) {
            return createDomainFunc(attributeName, lName, adapter);
        }
        if (fieldSource.fieldScale < 0) {
            const factor = Math.pow(10, fieldSource.fieldScale);
            let MaxValue;
            let MinValue;
            switch (fieldSource.fieldType) {
                case gdmn_db_1.FieldType.SMALL_INTEGER:
                    MaxValue = rdbadapter.MAX_16BIT_INT * factor;
                    MinValue = rdbadapter.MIN_16BIT_INT * factor;
                    break;
                case gdmn_db_1.FieldType.INTEGER:
                    MaxValue = rdbadapter.MAX_32BIT_INT * factor;
                    MinValue = rdbadapter.MIN_32BIT_INT * factor;
                    break;
                default:
                    MaxValue = rdbadapter.MAX_64BIT_INT * factor;
                    MinValue = rdbadapter.MIN_64BIT_INT * factor;
            }
            if (fieldSource.validationSource) {
                if (fieldSource.validationSource === 'CHECK(VALUE >= 0)'
                    || fieldSource.validationSource === 'CHECK(((VALUE IS NULL) OR (VALUE >= 0)))') {
                    MinValue = 0;
                }
                else {
                    console.warn(`Not processed for ${attributeName}: ${JSON.stringify(fieldSource.validationSource)}`);
                }
            }
            return new erm.NumericAttribute(attributeName, lName, required, fieldSource.fieldPrecision, fieldSource.fieldScale, MinValue, MaxValue, util_1.default2Number(defaultValue), adapter);
        }
        switch (fieldSource.fieldType) {
            case gdmn_db_1.FieldType.INTEGER:
                {
                    const fk = Object.entries(r.foreignKeys).find(([name, f]) => !!f.fields.find(fld => fld === attributeName));
                    if (fk && fk[1].fields.length === 1) {
                        const refRelationName = dbs.relationByUqConstraint(fk[1].constNameUq).name;
                        const cond = atField && atField.refCondition ? rdbadapter.condition2Selectors(atField.refCondition) : undefined;
                        const refEntities = findEntities(refRelationName, cond);
                        if (!refEntities.length) {
                            console.warn(`${r.name}.${rf.name}: no entities for table ${refRelationName}${cond ? ', condition: ' + JSON.stringify(cond) : ''}`);
                        }
                        return new erm.EntityAttribute(attributeName, lName, required, refEntities, adapter);
                    }
                    else {
                        return new erm.IntegerAttribute(attributeName, lName, required, rdbadapter.MIN_32BIT_INT, rdbadapter.MAX_32BIT_INT, util_1.default2Int(defaultValue), adapter);
                    }
                }
            case gdmn_db_1.FieldType.CHAR:
            case gdmn_db_1.FieldType.VARCHAR:
                {
                    let minLength = undefined;
                    if (fieldSource.fieldLength === 1 && fieldSource.validationSource) {
                        const enumValues = [];
                        const reValueIn = /CHECK\s*\((\(VALUE IS NULL\) OR )?(\(?VALUE\s+IN\s*\(\s*){1}((?:\'[A-Z0-9]\'(?:\,\s*)?)+)\)?\)\)/i;
                        let match;
                        if (match = reValueIn.exec(fieldSource.validationSource)) {
                            const reEnumValue = /\'([A-Z0-9]{1})\'/g;
                            let enumValue;
                            while (enumValue = reEnumValue.exec(match[3])) {
                                enumValues.push({ value: enumValue[1] });
                            }
                        }
                        if (enumValues.length) {
                            return new erm.EnumAttribute(attributeName, lName, required, enumValues, undefined, adapter);
                        }
                        else {
                            console.warn(`Not processed for ${attributeName}: ${JSON.stringify(fieldSource.validationSource)}`);
                        }
                    }
                    else {
                        if (fieldSource.validationSource) {
                            if (fieldSource.validationSource === "CHECK (VALUE > '')" ||
                                fieldSource.validationSource === "CHECK ((VALUE IS NULL) OR (VALUE > ''))") {
                                minLength = 1;
                            }
                            else {
                                console.warn(`Not processed for ${attributeName}: ${JSON.stringify(fieldSource.validationSource)}`);
                            }
                        }
                    }
                    return new erm.StringAttribute(attributeName, lName, required, minLength, fieldSource.fieldLength, undefined, true, undefined, adapter);
                }
            case gdmn_db_1.FieldType.TIMESTAMP:
                return new erm.TimeStampAttribute(attributeName, lName, required, undefined, undefined, util_1.default2Date(defaultValue), adapter);
            case gdmn_db_1.FieldType.DATE:
                return new erm.DateAttribute(attributeName, lName, required, undefined, undefined, util_1.default2Date(defaultValue), adapter);
            case gdmn_db_1.FieldType.TIME:
                return new erm.TimeAttribute(attributeName, lName, required, undefined, undefined, util_1.default2Date(defaultValue), adapter);
            case gdmn_db_1.FieldType.FLOAT:
            case gdmn_db_1.FieldType.DOUBLE:
                return new erm.FloatAttribute(attributeName, lName, required, undefined, undefined, util_1.default2Number(defaultValue), adapter);
            case gdmn_db_1.FieldType.SMALL_INTEGER:
                return new erm.IntegerAttribute(attributeName, lName, required, rdbadapter.MIN_16BIT_INT, rdbadapter.MAX_16BIT_INT, util_1.default2Int(defaultValue), adapter);
            case gdmn_db_1.FieldType.BIG_INTEGER:
                return new erm.IntegerAttribute(attributeName, lName, required, rdbadapter.MIN_64BIT_INT, rdbadapter.MAX_64BIT_INT, util_1.default2Int(defaultValue), adapter);
            case gdmn_db_1.FieldType.BLOB:
                if (fieldSource.fieldSubType === 1) {
                    return new erm.StringAttribute(attributeName, lName, required, undefined, undefined, undefined, false, undefined, adapter);
                }
                else {
                    return new erm.BLOBAttribute(attributeName, lName, required, adapter);
                }
            default:
                throw new Error(`Unknown data type ${fieldSource}=${fieldSource.fieldType} for field ${r.name}.${attributeName}`);
        }
    }
    ;
    function createAttributes(entity) {
        const relations = entity.adapter.relation.map(rn => dbs.relations[rn.relationName]);
        relations.forEach(r => {
            if (!r || !r.primaryKey)
                return;
            const atRelation = atrelations[r.name];
            Object.entries(r.relationFields).forEach(([fn, rf]) => {
                if (r.primaryKey.fields.find(f => f === fn))
                    return;
                if (fn === 'LB' || fn === 'RB')
                    return;
                if (entity.hasAttribute(fn))
                    return;
                if (!rdbadapter.hasField(entity.adapter, r.name, fn)
                    && !rdbadapter.systemFields.find(sf => sf === fn)
                    && !rdbadapter.isUserDefined(fn)) {
                    return;
                }
                if (entity.adapter.relation[0].selector && entity.adapter.relation[0].selector.field === fn) {
                    return;
                }
                const atRelationField = atRelation ? atRelation.relationFields[fn] : undefined;
                if (atRelationField && atRelationField.crossTable)
                    return;
                const attr = createAttribute(r, rf, atRelationField, entity.hasAttribute(fn) ? `${r.name}.${fn}` : fn, relations.length > 1 ? { relation: r.name, field: fn } : undefined);
                if (attr) {
                    entity.add(attr);
                }
            });
            Object.entries(r.unique).forEach(uq => {
                entity.addUnique(uq[1].fields.map(f => entity.attribute(f)));
            });
        });
    }
    Object.entries(erModel.entities).forEach(([name, entity]) => createAttributes(entity));
    /**
     * Looking for cross-tables and construct set attributes.
     *
     * 1. Cross tables are those whose PK consists of minimum 2 fields.
     * 2. First field of cross table PK must be a FK referencing owner table.
     * 3. Second field of cross table PK must be a FK referencing reference table.
     * 4. Owner in this context is an Entity(s) a Set attribute belongs to.
     * 5. Reference in this context is an Entity(s) a Set attribute contains objects of which type.
     */
    Object.entries(dbs.relations).forEach(([crossName, crossRelation]) => {
        if (crossRelation.primaryKey && crossRelation.primaryKey.fields.length >= 2) {
            const fkOwner = Object.entries(crossRelation.foreignKeys).find(([n, f]) => f.fields.length === 1 && f.fields[0] === crossRelation.primaryKey.fields[0]);
            if (!fkOwner)
                return;
            const fkReference = Object.entries(crossRelation.foreignKeys).find(([n, f]) => f.fields.length === 1 && f.fields[0] === crossRelation.primaryKey.fields[1]);
            if (!fkReference)
                return;
            const relOwner = dbs.relationByUqConstraint(fkOwner[1].constNameUq);
            const atRelOwner = atrelations[relOwner.name];
            if (!atRelOwner)
                return;
            let entitiesOwner;
            const crossRelationAdapter = crossRelationsAdapters[crossName];
            if (crossRelationAdapter) {
                entitiesOwner = findEntities(crossRelationAdapter.owner, crossRelationAdapter.selector ?
                    [crossRelationAdapter.selector] : undefined);
            }
            else {
                entitiesOwner = findEntities(relOwner.name);
            }
            if (!entitiesOwner.length) {
                return;
            }
            const relReference = dbs.relationByUqConstraint(fkReference[1].constNameUq);
            let cond;
            const atSetField = Object.entries(atRelOwner.relationFields).find(rf => rf[1].crossTable === crossName);
            const atSetFieldSource = atSetField ? atfields[atSetField[1].fieldSource] : undefined;
            if (atSetFieldSource && atSetFieldSource.setTable === relReference.name && atSetFieldSource.setCondition) {
                cond = rdbadapter.condition2Selectors(atSetFieldSource.setCondition);
            }
            const referenceEntities = findEntities(relReference.name, cond);
            if (!referenceEntities.length) {
                return;
            }
            const setField = atSetField ? relOwner.relationFields[atSetField[0]] : undefined;
            const setFieldSource = setField ? dbs.fields[setField.fieldSource] : undefined;
            const atCrossRelation = atrelations[crossName];
            entitiesOwner.forEach(e => {
                if (!Object.entries(e.attributes).find(([attrName, attr]) => (attr instanceof erm.SetAttribute) && !!attr.adapter && attr.adapter.crossRelation === crossName)) {
                    const setAttr = new erm.SetAttribute(atSetField ? atSetField[0] : crossName, atSetField ? atSetField[1].lName : (atCrossRelation ? atCrossRelation.lName : { en: { name: crossName } }), (!!setField && setField.notNull) || (!!setFieldSource && setFieldSource.notNull), referenceEntities, (setFieldSource && setFieldSource.fieldType === gdmn_db_1.FieldType.VARCHAR) ? setFieldSource.fieldLength : 0, {
                        crossRelation: crossName
                    });
                    Object.entries(crossRelation.relationFields).forEach(([addName, addField]) => {
                        if (!crossRelation.primaryKey.fields.find(f => f === addName)) {
                            setAttr.add(createAttribute(crossRelation, addField, atCrossRelation ? atCrossRelation.relationFields[addName] : undefined, addName, undefined));
                        }
                    });
                    e.add(setAttr);
                }
            });
        }
    });
    return erModel;
}
exports.erExport = erExport;
//# sourceMappingURL=index.js.map