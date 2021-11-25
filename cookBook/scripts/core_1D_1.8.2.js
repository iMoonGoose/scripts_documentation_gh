// core_1d_v1.8.2

const ENV = om.environment.get('ENV', null);

if (!ENV) {
    throw new Error('ENV not defined');
}

// Элемент дерева. Базовый класс
class TreeItem {
    constructor(identifier, label, levelIndex) {
        this.identifier = identifier;
        this.labelIdentifier = label.longId();
        this.labelParentIdentifier = label.parentLongId();
        this.labelName = label.name();
        /**
         * @type {TreeItem|null}
         */
        this.parent = null;
        this.levelIndex = levelIndex;
        this.relationItem = null;
    }

    getIdentifier() {
        return this.identifier;
    }

    getLevelIndex() {
        return this.levelIndex;
    }

    getLabelIdentifier() {
        return this.labelIdentifier;
    }

    getLabelParentIdentifier() {
        return this.labelParentIdentifier;
    }

    getLabelName() {
        return this.labelName;
    }

    getRelationItem() {
        return this.relationItem;
    }

    /**
     * @returns {TreeItem}
     */
    getParent() {
        return this.parent;
    }

    /**
     * @param {TreeItem} item
     */
    setParent(item) {
        this.parent = item
    }

    /**
     * @param {TreeItem} item
     */
    setRelationItem(item) {
        this.relationItem = item;
    }

    /**
     * @returns {TreeItem[]}
     */
    getItemStair() {
        let items = [];

        if (this.parent) {
            items = this.parent.getItemStair();
        }

        items.push(this);

        return items;
    }
}

// Элемент дерева-источника
class SourceTreeItem extends TreeItem {
    /**
     * @param {string} identifier
     * @param {Label} label
     * @param {number} levelIndex
     */
    constructor(identifier, label, levelIndex) {
        super(identifier, label, levelIndex);
        this.cellIdentifier = null;
        this.hasLevel = false;
    }

    setCellIdentifier(cellIdentifier) {
        this.cellIdentifier = cellIdentifier;
    }

    getCellIdentifier() {
        return this.cellIdentifier;
    }

    setHasLevel(hasLevel) {
        this.hasLevel = hasLevel;
    }

    getHasLevel() {
        return this.hasLevel;
    }
}

// Элемент дерева-приёмника
class DestTreeItem extends TreeItem {
    /**
     * @param {string} identifier
     * @param {Label} label
     * @param {number} levelIndex
     */
    constructor(identifier, label, levelIndex) {
        super(identifier, label, levelIndex);
        this.destStatus = false;
    }

    /**
     * @param {boolean} value
     */
    setDestStatus(value) {
        this.destStatus = value;
    }

    /**
     * @returns {boolean}
     */
    getDestStatus() {
        return this.destStatus;
    }
}

// Элемент дерева лестницы родителей
class ParentStairTreeItem extends TreeItem {
    constructor(label) {
        super(label.longId(), label, 0);
    }

    longId() {
        return this.getLabelIdentifier();
    }

    parentLongId() {
        return this.getLabelParentIdentifier();
    }

    name() {
        return this.getLabelName();
    }
}

// Диспетчер дерева. Базовый класс
class TreeManager {
    constructor() {
        /**
         * @type {Map<string, TreeItem>}
         */
        this.tree = new Map;
    }

    /**
     * @param {TreeItem} item
     */
    addItem(item) {
        this.tree.set(item.getIdentifier(), item);
    }

    /**
     * @param {string|number} identifier
     * @returns {undefined|TreeItem}
     */
    getItem(identifier) {
        return this.tree.get(identifier);
    }

    /**
     * @param identifier
     * @returns {boolean}
     */
    hasItem(identifier) {
        return this.tree.has(identifier);
    }

    /**
     * @param {TreeItem} parentItem
     * @param {TreeItem} childrenItem
     */
    addRelation(parentItem, childItem) {
        childItem.setParent(parentItem);
    }

    /**
     * @param itemLeft
     * @param itemRight
     */
    setCrossRelation(itemLeft, itemRight) {
        itemLeft.setRelationItem(itemRight);
        itemRight.setRelationItem(itemLeft);
    }
}

class SourceRelationColumnUpdater {
    constructor(/**SourceTreeManager*/tree, params) {
        this.tree = tree;
        this.params = params;
        /**
         * @type {CubeCellSelector}
         * @private
         */
        this._selector = null;
        /**
         * @type {CsvWriter}
         * @private
         */
        this._writer = null;
    }

    getTab() {
        return om.multicubes.multicubesTab().open(this.params.MULTICUBE_NAME);
    }

    /**
     *
     * @returns {CubeCellSelector}
     */
    getSelector() {
        if (!this._selector) {
            const builder = this.getTab().cubeCellSelector(this.params.RELATION_CUBE_NAME);
            this._selector = builder.setFormula(`'${this.params.INTERSECTION_CUBE_NAME}' = TRUE`).load();
        }
        return this._selector;
    }

    loadHeaders() {
        const headers = [];
        this.getSelector().getCubeDimensions().forEach(dimension => {
            headers.push(dimension.name());
        });
        headers.push(this.params.RELATION_CUBE_NAME);
        this.getWriter().writeRow(headers);
    }

    /**
     * @returns {CsvWriter}
     */
    getWriter() {
        if (!this._writer) {
            this._writer = om.filesystems.filesDataManager().csvWriter();
            this.loadHeaders();
        }
        return this._writer;
    }

    applyWriter(count) {
        if (this._writer) {
            om.common.requestInfo().logStatusMessage(`Update relation cube ${count} cells`, true);
            this._writer.save('file');
            this.getTab().storageImporter().setFilePath('file.csv').import();
        }
    }

    loadCellData() {
        let count = 0;

        for (let cell of this.getSelector().generator()) {
            let identifier = this.tree.getCellIdentifier(cell);
            let sourceItem = this.tree.cellIdentifierMap.get(identifier);
            if (!sourceItem) {
                throw new Error(`Can't found source item relation '${identifier}'`);
            }
            let destItem = sourceItem.getRelationItem();
            if (!destItem) {
                throw new Error(`Can't found destination item in source item relation '${sourceItem.getIdentifier()}'`);
            }
            if (cell.getValue() !== destItem.getLabelIdentifier()) {
                const cellRow = [];
                cell.getDimensionItems().forEach(dimensionItem => {
                    cellRow.push(dimensionItem.name());
                });
                cellRow.push(destItem.getLabelName());
                this.getWriter().writeRow(cellRow);
                count++;
            }
        }

        return count;
    }

    run() {
        om.common.requestInfo().logStatusMessage(`Updating source relation cube`, true);
        const count = this.loadCellData();
        this.applyWriter(count);
    }
}

// Диспетчер дерева-источника
class SourceTreeManager extends TreeManager {
    constructor(sourceInfo) {
        super();
        this.params = sourceInfo;

        // Диспетчеры родительских справочников из PARENT_STAIR по каждому измерению
        /**
         * @type {SourceDimensionManager[]}
         */
        this.parentStairManagers = [];
        /**
         *
         * @type {Map<string, SourceTreeItem>}
         */
        this.cellIdentifierMap = new Map;
    }

    // Добавляет строку из справочника и всех предков в дерево-источник
    /**
     * @param {CubeCell} rowLabels
     */
    appendRow(cell) {
        let cellIdentifier = this.getCellIdentifier(cell);
        let cellDimensionItems = cell.getDimensionItems();
        if (cellDimensionItems.length != this.params.DIMENSION_MAP.length) {
            throw new Error('Source dimension map and cube dimensions not same');
        }

        let prevItem = null;
        let levelIndex = 0;

        // Вспомогательная функция, добавляет элемент измерения в дерево
        const appendRow = (identifier, labelInfo) => {
            if (prevItem) {
                identifier = `${prevItem.getIdentifier()}:${identifier}`;
            }

            if (this.hasItem(identifier)) {
                prevItem = this.getItem(identifier);
                levelIndex = prevItem.getLevelIndex() + 1;
                return;
            }

            let item = new SourceTreeItem(identifier, labelInfo, levelIndex);
            this.addItem(item);

            if (prevItem) {
                this.addRelation(prevItem, item);
            }

            prevItem = item;
            levelIndex++;
        };

        this.params.DIMENSION_MAP.forEach((dimensionParams, sourceLevelIndex) => {
            let cellDimension = cellDimensionItems[dimensionParams.DIMENSION_INDEX];

            this.parentStairManagers[sourceLevelIndex].eachParentStairItem(cellDimension.longId(), parentItem => {
                appendRow(`${parentItem.getLabelIdentifier()}`, parentItem);
            });

            appendRow(`${cellDimension.longId()}`, cellDimension);
        });
        if (!prevItem) {
            throw new Error(`Source items not found`);
        }
        prevItem.setCellIdentifier(cellIdentifier);
        this.cellIdentifierMap.set(cellIdentifier, prevItem);
    }

    // Вычисляет индексы измерений относительно getDimensions() куба и сохраняет их в DIMENSION_MAP[i].DIMENSION_INDEX
    loadDimensionIndexes(/**EntityInfo[]*/entities) {
        this.params.DIMENSION_MAP.forEach(dimension => {
            entities.forEach((entity, index) => {
                if (entity.name() == dimension.DIMENSION_NAME) {
                    dimension.DIMENSION_INDEX = index;
                }
            });
            if (dimension.DIMENSION_INDEX === null || dimension.DIMENSION_INDEX === undefined) {
                throw new Error(`Dimension '${dimension.DIMENSION_NAME}' not found`);
            }
        });
    }

    // Загружает дерево-источник в память
    loadSourceTree() {
        om.common.requestInfo().logStatusMessage(`Load source tree`, true);
        let cubeName = this.params.INTERSECTION_CUBE_NAME;
        let tab = om.multicubes.multicubesTab().open(this.params.MULTICUBE_NAME);
        let cubeCellSelectorBuilder = tab.cubeCellSelector(cubeName);
        let cubeCellSelector = cubeCellSelectorBuilder.setFormula(`'${cubeName}' = TRUE`).load();
        this.loadDimensionIndexes(cubeCellSelector.getCubeDimensions());
        for (let cell of cubeCellSelector.generator()) {
            this.appendRow(cell);
        }
        om.common.requestInfo().logStatusMessage(
            `Source tree '${this.params.MULTICUBE_NAME}'.'${cubeName}' has ${this.tree.size} items`,
            true
        );
    }

    // Возвращает идентификатор клетки в виде строки из id измерений, разделённых двоеточиями
    // Например, '310000000198:692000000030'
    /**
     * @param cell
     * @returns {string}
     */
    getCellIdentifier(/**CubeCell*/cell) {
        let dimensionItems = cell.getDimensionItems();
        let identifier = [];
        this.params.DIMENSION_MAP.forEach(dimensionParams => {
            let dimension = dimensionItems[dimensionParams.DIMENSION_INDEX];
            identifier.push(dimension.longId());
        });
        return identifier.join(':');
    }

    // Обновляет столбец RELATION_CUBE_NAME
    updateSourceRelationColumn() {
        if (!this.params.RELATION_CUBE_NAME) {
            return;
        }
        (new SourceRelationColumnUpdater(this, this.params)).run();
    }

    // Загружает родительские справочники из PARENT_STAIR, если они есть
    loadSourceDimensions() {
        if (!this.params.DIMENSION_MAP) {
            return;
        }
        om.common.requestInfo().logStatusMessage(`Load source dimensions`, true);
        this.params.DIMENSION_MAP.forEach(dimensionInfo => {
            let manager = new SourceDimensionManager(dimensionInfo);
            manager.load();
            this.parentStairManagers.push(manager);
        });
    }
}

// Диспетчер дерева-приёмника
class DestTreeManager extends TreeManager {
    constructor() {
        super();
        /**
         * @type {Map<number, DestTreeItem>}
         */
        this.labelIdentifierMap = new Map;
        this.freeItemIdentifiers = [];
    }

    /**
     * @param {DestTreeItem|TreeItem} item
     */
    addItem(item) {
        super.addItem(item);
        this.labelIdentifierMap.set(item.getLabelIdentifier(), item);
    }

    /**
     *
     * @param {number} identifier
     * @returns {undefined|DestTreeItem}
     */
    getItemByLabelIdentifier(identifier) {
        return this.labelIdentifierMap.get(identifier);
    }

    // Загружает одну строку дерева-приёмника
    /**
     * @param {LabelsGroup} rowLabels
     * @param {number} index
     * @param params
     * @return DestTreeItem|null
     */
    appendRow(rowLabels, index, params) {
        let columns = {};
        rowLabels.cells().all().forEach(cell => {
            columns[cell.columns().first().label()] = cell;
        });
        if (!columns.hasOwnProperty('List')) {
            throw new Error(`Destination '${params.LIST_NAME}' column 'List' not found`);
        }
        if (columns['List'].getNativeValue() !== params.LIST_NAME) {
            return null;
        }
        let identifier = [];
        let hasBadIdentifier = params.ID_COLUMNS.some(columnName => {
            if (!columns.hasOwnProperty(columnName)) {
                throw new Error(`Destination column name '${columnName}' not found`);
            }
            let value = columns[columnName].getNativeValue();
            if (value === "" || value === null) {
                return true;
            }
            identifier.push(value);
        });
        if (hasBadIdentifier || !identifier.length) {
            // Добавляем элемент без составного идентификатора как свободный к переиспользованию
            this.freeItemIdentifiers.push(rowLabels.first().longId())
            return null;
        }
        identifier = identifier.join(':');
        if (this.hasItem(identifier)) {
            throw new Error(`Destination item '${identifier}' already exist`);
        }
        let item = new DestTreeItem(identifier, rowLabels.first(), index);
        if (params.STATUS_COLUMN) {
            if (!columns.hasOwnProperty(params.STATUS_COLUMN)) {
                throw new Error(`Destination column name '${params.STATUS_COLUMN}' not found`);
            }
            item.setDestStatus(columns[params.STATUS_COLUMN].getNativeValue() === 'true');
        }
        this.addItem(item);
        let parent = this.getItemByLabelIdentifier(item.getLabelParentIdentifier());
        if (parent) {
            this.addRelation(parent, item);
        }
        return item;
    }

    getFreeItemIdentifiers() {
        return this.freeItemIdentifiers;
    }
}

// Диспетчер дерева лестницы родителей
class ParentStairTreeManager extends TreeManager {
    constructor() {
        super();
    }

    // Добавляет в дерево первый элемент из rowLabels
    appendRow(rowLabels) {
        let item = new ParentStairTreeItem(rowLabels.first());
        this.addItem(item);
        let parentIdentifier = item.getLabelParentIdentifier();
        if (parentIdentifier !== -1) {
            let parent = this.getItem(parentIdentifier);
            if (!parent) {
                throw new Error(`Parent '${parentIdentifier}' not found`);
            }
            this.addRelation(parent, item);
        }
    }
}

// Базовый класс диспетчеров манипуляции элементами измерений
class DimensionManager {
    constructor(cellBufferManager, params, index) {
        /**
         * @type {CellBufferManager}
         */
        this.cellBufferManager = cellBufferManager;
        this.index = index;
        this.params = params;
        this.items = [];
        this.canManage = this.params.CAN_MANAGE && this.params.STATUS_COLUMN;
    }

    // Условие добавления в массив для обновления; реализация в классах-потомках
    canAppendItem(item) {
        return false;
    }

    // Добавляет элемент дерева во внутренний массив для последующей обработки (создание, изменение, удаление)
    appendItem(item) {
        if (!this.canAppendItem(item)) {
            return false;
        }
        this.items.push(item);
        return true;
    }

    // Применение операций; реализация в классах-потомках
    apply() {
        throw new Error('Method not implemented');
    }

    // Оптимизация работы с гридом, получаем только по актуальные колонки
    getColumnFilter() {
        const names = [...this.params.ID_COLUMNS];

        names.push('Parent');
        names.push('List');

        if (this.params.DIMENSION_COLUMN) {
            names.push(this.params.DIMENSION_COLUMN);
        }

        if (this.params.STATUS_COLUMN) {
            names.push(this.params.STATUS_COLUMN);
        }

        return [...new Set(names)];
    }

    // Построчный итератор элементов items измерения
    loadListRows(identifiers, rowCallback) {
        let tab = om.lists.listsTab().open(this.params.LIST_NAME);
        let pivot = tab.pivot(this.params.VIEW_NAME);
        if (identifiers !== null) {
            pivot.rowsFilter(identifiers);
        }
        let generator = pivot
            .columnsFilter(this.getColumnFilter())
            .create()
            .range()
            .generator(5000);
        let rowIndex = 0;
        for (let chunk of generator) {
            let ignore = chunk.rows().all().some(rowLabels => {
                let result = rowCallback(rowIndex, rowLabels);
                rowIndex++;
                return result;
            });
            if (ignore) {
                break;
            }
        }
    }
}

// Диспетчер создания элементов измерения
class DimensionCreatorManager extends DimensionManager {
    constructor(cellBufferManager, params, index) {
        super(cellBufferManager, params, index);
        /**
         * @type {SourceTreeItem[]}
         */
        this.items = [];
        /**
         * @type {SourceTreeManager|null}
         */
        this.sourceTree = null;
        /**
         * @type {DestTreeManager|null}
         */
        this.destTree = null;
        this.canManage = this.params.CAN_MANAGE;
        this.addToStart = this.params.ADD_TO_START;
        this.chunkSize = 10000;
    }

    setSourceTree(tree) {
        this.sourceTree = tree;
    }

    setDestTree(tree) {
        this.destTree = tree;
    }

    // Можем добавить элемент в измерение-приёмник, если в источнике нет ему соответствия
    canAppendItem(item) {
        if (!this.canManage) {
            return false;
        }
        return !item.getRelationItem();
    }

    // Создаёт элементы в конце справочника. Независимо от значения параметра ADD_TO_START
    createItems(totalSize) {
        const identifierChunks = [];
        const chunks = Math.ceil(totalSize / this.chunkSize);
        for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
            const size = totalSize < this.chunkSize ? totalSize : this.chunkSize;
            om.common.requestInfo().logStatusMessage(
                `Added ${size} items to list '${this.params.LIST_NAME}' (Chunk ${chunkIndex + 1}/${chunks})`,
                true
            );
            const tab = om.lists.listsTab().open(this.params.LIST_NAME);
            identifierChunks.push(tab.elementsCreator().numeric().setCount(size).setPositionEnd().create());
            totalSize -= size;
        }
        return identifierChunks;
    }

    // Проверяет, что у каждого элемента есть родитель и соответствующий родителю приёмник
    validateItems() {
        this.items.forEach(/**SourceTreeItem*/item => {
            let parent = item.getParent();
            if (!parent) {
                // Если у элемента нет парента, значит он рутовый
                return null;
            }
            if (parent.getHasLevel() && !parent.getRelationItem()) {
                let itemIdentifier = `'${item.getLabelName()}'(${item.getIdentifier()})`;
                let parentItemIdentifier = `'${parent.getLabelName()}'(${parent.getIdentifier()})`;
                throw new Error(`Source ${itemIdentifier} destination parent ${parentItemIdentifier} relation not found`);
            }
        });
    }

    getParentColumnName() {
        return this.params.hasOwnProperty("PARENT_COLUMN") ? this.params.PARENT_COLUMN : "Parent";
    }

    // Вернет свободные элементы и при нехватке добавит новых
    getFreeItems(totalSize) {
        const freeItemIdentifiers = this.destTree.getFreeItemIdentifiers().slice(0, totalSize);
        const identifierChunks = Array.from(
            {length: Math.ceil(freeItemIdentifiers.length / this.chunkSize)},
            (v, i) => freeItemIdentifiers.slice(i * this.chunkSize, i * this.chunkSize + this.chunkSize)
        );
        totalSize -= freeItemIdentifiers.length;
        if (totalSize > 0) {
            return [...identifierChunks, ...this.createItems(totalSize)];
        } else {
            return identifierChunks;
        }
    }

    // Применение всего: создание элементов в справочнике назначения
    apply() {
        if (!this.canManage || !this.items.length) {
            return;
        }

        this.validateItems();

        let identifierChunks = [];

        if (this.params.CAN_REUSE_FREE_ITEMS) {
            identifierChunks = this.getFreeItems(this.items.length);
        } else {
            // Фактическое создание (пустых) элементов
            identifierChunks = this.createItems(this.items.length);
        }
        let parentCellBuffer = this.cellBufferManager.get("DEST_PARENT");
        let attrCellBuffer = this.cellBufferManager.get("DEST_ATTR");

        // Получаем альтернативное имя колоки Parent или выключаем ее обновление при значении null
        const parentColumnName = this.getParentColumnName();

        // Заполнение полей STATUS_COLUMN, DIMENSION_COLUMN, Parent
        identifierChunks.forEach(identifiers => {
            this.loadListRows(identifiers, (rowIndex, rowLabels) => {
                let item = this.items[rowIndex];
                let columns = [];
                rowLabels.cells().all().forEach(cell => {
                    columns[cell.columns().first().name()] = cell;
                });
                if (parentColumnName != null) {
                    if (!columns.hasOwnProperty(parentColumnName)) {
                        throw new Error(`Column 'Parent' not found`);
                    }
                    // Если у элемента нет парента, значит бросаем его в рут
                    const parent = item.getParent() ? item.getParent().getRelationItem().getLabelName() : null;
                    parentCellBuffer.set(columns['Parent'], parent);
                }
                if (this.params.STATUS_COLUMN) {
                    if (!columns.hasOwnProperty(this.params.STATUS_COLUMN)) {
                        throw new Error(`Column '${this.params.STATUS_COLUMN}' not found`);
                    }
                    attrCellBuffer.set(columns[this.params.STATUS_COLUMN], 'true');
                }
                if (this.params.DIMENSION_COLUMN) {
                    if (!columns.hasOwnProperty(this.params.DIMENSION_COLUMN)) {
                        throw new Error(`Column '${this.params.DIMENSION_COLUMN}' not found`);
                    }
                    attrCellBuffer.set(columns[this.params.DIMENSION_COLUMN], item.getLabelName());
                }
                if (this.params.CAN_UPDATE_ID_COLUMNS) {
                    // Получаем элемент и его лестницу парентов
                    const itemStair = item.getItemStair();
                    // Каждый полученный элемент из лестницы вставляем в колонку из ID_COLUMNS через соотношение по индексу
                    this.params.ID_COLUMNS.forEach((colName, index) => {
                        if (!columns.hasOwnProperty(colName)) {
                            throw new Error(`Column '${colName}' not found`);
                        }
                        if (itemStair.length <= index) {
                            const stats = `COL: ${colName}, ID: ${item.getIdentifier()}, INDEX: ${index}, LENGTH: ${itemStair.length}`;
                            throw new Error(
                                `Can't match ID_COLUMNS and item stair by index (${stats})`
                            );
                        }
                        attrCellBuffer.set(columns[colName], itemStair[index].getLabelName());
                    });
                }
            });
        });

        this.cellBufferManager.apply(() => {
            if (this.addToStart) {
                identifierChunks.forEach(identifiers => {
                    // Перемещение элементов в начало справочника, если был задан ADD_TO_START
                    const elementsReorder = om.lists.listsTab()
                        .open(this.params.LIST_NAME)
                        .elementsReorder();
                    identifiers.forEach(item => {
                        elementsReorder.append(item, -1, 'Start');
                    });
                    om.common.requestInfo().logStatusMessage(`Reordering ${elementsReorder.count()} items`, true);
                    elementsReorder.reverse().reorder();
                });
            }
        });

        // Добавление созданных элементов в дерево-приёмник и простановка двунаправленных связей с деревом-источником
        identifierChunks.forEach(identifiers => {
            this.loadListRows(identifiers, (rowIndex, rowLabels) => {
                let destItem = this.destTree.appendRow(rowLabels, this.index, this.params);
                if (!destItem) {
                    throw new Error(`Failed '${rowLabels.first().alias()}'(${rowLabels.first().longId()}) item creation`);
                }
                let destItemName = `'${destItem.getLabelName()}'(${destItem.getLabelIdentifier()})`;
                if (destItem.getRelationItem()) {
                    throw new Error(`Destination item ${destItemName} already has relation with source item`);
                }
                let sourceItem = this.sourceTree.getItem(destItem.getIdentifier());
                if (!sourceItem) {
                    throw new Error(`Can't found source item for destination item ${destItemName}`);
                }
                if (sourceItem.getRelationItem()) {
                    throw new Error(`Source item ${destItemName} already has relation with destination item`);
                }
                this.destTree.setCrossRelation(destItem, sourceItem);
            });
        });
    }
}

// Диспетчер обновления элементов измерения
class DimensionUpdaterManager extends DimensionManager {
    constructor(cellBufferManager, params, index) {
        super(cellBufferManager, params, index);
        /**
         * @type {DestTreeItem[]}
         */
        this.items = [];
    }

    // Условие добавления в массив для обновления
    canAppendItem(item) {
        if (!this.params.STATUS_COLUMN) {
            return false;
        }
        if (!item.getRelationItem() || item.getDestStatus()) {
            return false;
        }
        return true;
    }

    // Возвращает массив идентификаторов элементов, готовящихся на обновление
    getIdentifiers() {
        let identifiers = [];
        this.items.forEach(item => {
            identifiers.push(item.getLabelIdentifier());
        });
        return identifiers;
    }

    // Возвращает элемент из items по номеру строки; строки после фильтрации
    getItemByInput(rowIndex, rowLabels) {
        let item = this.items[rowIndex];
        if (item.getLabelIdentifier() != rowLabels.first().longId()) {
            throw new Error(`Item ${item.getLabelIdentifier()} not found`);
        }
        return item;
    }

    // Возвращает строку таблицы в виде объекта
    getColumnsForRow(rowLabels) {
        let columns = [];
        rowLabels.cells().all().forEach(cell => {
            columns[cell.columns().first().name()] = cell;
        });
        if (!columns.hasOwnProperty(this.params.STATUS_COLUMN)) {
            throw new Error(`Column '${this.params.STATUS_COLUMN}' not found`);
        }
        return columns;
    }

    applyStatusColumn = (cellBuffer, item, columns, value) => {
        if (!this.params.STATUS_COLUMN) {
            return;
        }
        if (!columns.hasOwnProperty(this.params.STATUS_COLUMN)) {
            throw new Error(`Column '${this.params.STATUS_COLUMN}' not found`);
        }
        item.setDestStatus(value);
        cellBuffer.set(columns[this.params.STATUS_COLUMN], value ? 'true' : 'false');
    };

    // Активируем существующие элементы приемника через колонку статуса
    apply() {
        if (!this.params.STATUS_COLUMN) {
            return;
        }
        let identifiers = this.getIdentifiers();
        if (!identifiers.length) {
            return;
        }
        let cellBuffer = this.cellBufferManager.get("DEST_ATTR");
        this.loadListRows(identifiers, (rowIndex, rowLabels) => {
            this.applyStatusColumn(
                cellBuffer,
                this.getItemByInput(rowIndex, rowLabels),
                this.getColumnsForRow(rowLabels),
                true
            );
        });
    }
}

// Диспетчер удаления элементов измерения
class DimensionDeleterManager extends DimensionUpdaterManager {

    // Условие добавления в массив для обновления
    canAppendItem(item) {
        if (!this.params.STATUS_COLUMN) {
            return false;
        }
        if (item.getRelationItem() || !item.getDestStatus()) {
            return false;
        }
        return true;
    }

    // Если разрешено переиспользовать свободные элементы,
    // то их нужно освободить очистив составной идентификатор
    applyReuseAction = (cellBuffer, item, columns, value) => {
        if (!this.params.CAN_REUSE_FREE_ITEMS) {
            return;
        }
        // Если разрешено переиспользовать свободные элементы,
        // то их нужно освободить очистив составной идентификатор
        if (this.params.DIMENSION_COLUMN) {
            if (!columns.hasOwnProperty(this.params.DIMENSION_COLUMN)) {
                throw new Error(`Column '${this.params.DIMENSION_COLUMN}' not found`);
            }
            cellBuffer.set(columns[this.params.DIMENSION_COLUMN], value);
        }
        if (this.params.CAN_UPDATE_ID_COLUMNS) {
            this.params.ID_COLUMNS.forEach(colName => {
                if (!columns.hasOwnProperty(colName)) {
                    throw new Error(`Column '${colName}' not found`);
                }
                cellBuffer.set(columns[colName], value);
            });
        }
    };

    // Дезактивируем элементы через колонку статуса и опционально чистим составной идентификатор
    apply() {
        if (!this.params.STATUS_COLUMN && !this.params.CAN_REUSE_FREE_ITEMS) {
            return;
        }

        let identifiers = this.getIdentifiers();
        if (!identifiers.length) {
            return;
        }

        let cellBuffer = this.cellBufferManager.get("DEST_ATTR");

        this.loadListRows(identifiers, (rowIndex, rowLabels) => {
            let item = this.getItemByInput(rowIndex, rowLabels);
            let columns = this.getColumnsForRow(rowLabels);
            this.applyStatusColumn(
                cellBuffer,
                item,
                columns,
                false
            );
            this.applyReuseAction(
                cellBuffer,
                item,
                columns,
                null
            );
        });
    }
}

// Диспетчер измерения
class DimensionMapManager {
    constructor(params, cellBufferManager) {
        this.params = params;
        this.cellBufferManager = cellBufferManager;
    }

    hasLevel(level) {
        const params = this.params[level];
        return params && params.hasOwnProperty("LIST_NAME");
    }

    // Возвращает флаг CAN_MANAGE возможности редактирования элемента (и всего его измерения)
    canUpdate(item) {
        return this.getLevelParams(item).CAN_MANAGE;
    }

    // Возвращает блок параметров внутри DIMENSION_MAP, соответствующий элементу item дерева
    getLevelParams(item) {
        return this.params[item.getLevelIndex()];
    }

    // Создаёт на лету и возвращает коллекцию диспетчеров измерений; общая функция
    getDimensionCollection(managerCreatorCallback) {
        let collection = [];
        this.params.forEach((listParams, index) => {
            collection.push(managerCreatorCallback(listParams, index));
        });
        return collection;
    }

    // Создаёт на лету и возвращает коллекцию диспетчеров удаляторов элементов измерений
    /**
     * @returns {DimensionDeleterManager[]}
     */
    getDimensionDeleterCollection() {
        return this.getDimensionCollection((listParams, index) => {
            return new DimensionDeleterManager(this.cellBufferManager, listParams, index);
        });
    }

    // Создаёт на лету и возвращает коллекцию диспетчеров обновляторов элементов измерений
    /**
     * @returns {DimensionUpdaterManager[]}
     */
    getDimensionUpdaterCollection() {
        return this.getDimensionCollection((listParams, index) => {
            return new DimensionUpdaterManager(this.cellBufferManager, listParams, index);
        });
    }

    // Создаёт на лету и возвращает коллекцию диспетчеров создателей элементов измерений
    /**
     * @returns {DimensionCreatorManager[]}
     */
    getDimensionCreatorCollection() {
        return this.getDimensionCollection((listParams, index) => {
            return new DimensionCreatorManager(this.cellBufferManager, listParams, index);
        });
    }
}

// Диспетчер родительских справочников
class SourceDimensionManager {
    constructor(params) {
        this.levels = null;
        this.params = params;
        this.treeManager = new ParentStairTreeManager();
        this.canManage = !!this.params.PARENT_STAIR;
    }

    // Фактически загружает всех родителей из PARENT_STAIR
    loadListRow(rowCallback) {
        let tab = om.lists.listsTab().open(this.params.PARENT_STAIR.LIST_NAME);
        let pivot = tab.pivot(this.params.PARENT_STAIR.VIEW_NAME);
        let generator = pivot.create().range(0, -1, 0, 0).generator(5000);
        for (let chunk of generator) {
            let canBreak = chunk.rows().all().some(rowLabels => {
                return rowCallback(rowLabels);
            });
            if (canBreak) {
                break;
            }
        }
    }

    // Возвращает родительские уровни в виде отсортированного массива
    // Фактически работает однажды, потом возвращает сохранённый массив
    getParentStairLevels() {
        if (this.levels !== null) {
            return this.levels;
        }
        this.levels = this.params.PARENT_STAIR.LEVELS;
        if (!Array.isArray(this.levels)) {
            this.levels = [...Array(this.levels).keys()]
        }
        this.levels = [...new Set(this.levels)];
        this.levels.sort((a, b) => a - b);
        return this.levels;
    }

    // Вызывает callback для каждого родительского элемента лестницы предков
    eachParentStairItem(identifier, callback) {
        if (!this.canManage) {
            return;
        }
        let result = [];
        let item = this.treeManager.getItem(identifier);
        if (!item) {
            throw new Error(`Item '${identifier}' not found`);
        }
        let levels = this.getParentStairLevels();
        if (!levels.length) {
            return;
        }
        for (let level = 0; level <= levels[levels.length - 1]; level++) {
            item = item.getParent();
            if (!item) {
                throw new Error(`Item '${identifier}' not valid`);
            }
            if (levels.indexOf(level) !== -1) {
                result.push(item);
            }
        }
        result.reverse().forEach(item => {
            callback(item);
        });
    }

    // Загружает всю вереницу родителей из PARENT_STAIR
    load() {
        if (!this.canManage) {
            return;
        }

        om.common.requestInfo().logStatusMessage(
            `Load parent stair from list '${this.params.PARENT_STAIR.LIST_NAME}'`,
            true
        );

        this.loadListRow(/**LabelsGroup*/rowLabels => {
            this.treeManager.appendRow(rowLabels);
        });
    }
}

class CellBufferItem {
    /**
     * @param {CellBufferManager} manager
     * @param name
     */
    constructor(manager, name) {
        this.manager = manager;
        this.name = name;
        this.buffers = [];
        this.chunkSize = manager.getChunkSize();
        this._switchToNewBuffer();
    }

    _switchToNewBuffer() {
        this.buffer = om.common.createCellBuffer().canLoadCellsValues(false);
        this.buffers.push(this.buffer);
        this.bufferSize = 0;
    }

    getCount() {
        let count = 0;
        this.buffers.forEach(/**CellBuffer*/buffer => {
            count += buffer.count()
        });
        return count;
    }

    set(cell, value) {
        this.buffer.set(cell, value);
        this.bufferSize++;
        if (this.bufferSize >= this.chunkSize) {
            this._switchToNewBuffer();
        }
    }

    apply() {
        this.buffers.forEach((/**CellBuffer*/buffer, index) => {
            if (!buffer.count()) {
                return;
            }
            om.common.requestInfo().logStatusMessage(
                `Update '${this.name}' ${buffer.count()} cells (Chunk ${index + 1}/${this.buffers.length})`,
                true
            );
            buffer.apply();
        });
        this.buffers = [];
        this._switchToNewBuffer();
    }
}

class CellBufferManager {
    constructor(params) {
        this.params = params;
        /**
         * @type {Object.<string, CellBufferItem>}
         */
        this.buffers = {};
    }

    getChunkSize() {
        return this.params.hasOwnProperty("CHUNK_SIZE") ? this.params.CHUNK_SIZE : Number.MAX_SAFE_INTEGER;
    }

    /**
     *
     * @param name
     * @returns {CellBufferItem}
     */
    get(name) {
        if (!this.buffers.hasOwnProperty(name)) {
            this.buffers[name] = new CellBufferItem(this, name);
        }

        return this.buffers[name];
    }

    getCount() {
        let count = 0;
        Object.keys(this.buffers).forEach(name => {
            count += this.buffers[name].getCount();
        });
        return count;
    }

    apply(callback = null) {
        if (!this.getCount()) {
            return;
        }
        if (this.params.MANUAL_RECALCULATION === true) {
            // Включаем режим ручного пересчета
            om.common.modelInfo().setModelCalculationMode(false);
        }
        Object.keys(this.buffers).forEach(name => {
            this.buffers[name].apply();
        });
        if (callback !== null) {
            callback();
        }
        if (this.params.MANUAL_RECALCULATION === true) {
            // Выключаем режим ручного пересчета
            om.common.modelInfo().setModelCalculationMode(true);
        }
    }
}

class Macros {
    constructor() {
        this.cellBufferManager = new CellBufferManager(
            ENV.hasOwnProperty("CELL_BUFFER") ? ENV.DESTINATION_INFO.CELL_BUFFER : {}
        );
        this.sourceTree = new SourceTreeManager(ENV.SOURCE_INFO);
        this.destTree = new DestTreeManager;
        this.dimensionMapManager = new DimensionMapManager(
            ENV.DESTINATION_INFO.DIMENSION_MAP,
            this.cellBufferManager
        );
    }

    // Возвращает полное имя измерения: либо LIST_NAME, либо LIST_NAME.VIEW_NAME
    /**
     * @returns {string}
     */
    getDestFullName(params) {
        let name = [
            params.LIST_NAME
        ];
        if (params.VIEW_NAME) {
            name.push(params.VIEW_NAME);
        }
        return `'${name.join("'.'")}'`;
    }

    // Загружает дерево-источник
    loadSourceTree() {
        this.sourceTree.loadSourceDimensions();
        this.sourceTree.loadSourceTree();
    }

    // Загружает один уровень (один справочник) дерева-приёмника
    loadDestList(index, params) {
        if (!params.LIST_NAME) {
            return;
        }
        const dimensionManager = new DimensionManager(this.cellBufferManager, params, index);
        dimensionManager.loadListRows(null, (rowIndex, rowLabels) => {
            this.destTree.appendRow(rowLabels, index, params);
        });
        om.common.requestInfo().logStatusMessage(
            `Destination tree ${this.getDestFullName(params)} has ${this.destTree.tree.size} items`,
            true
        );
    }

    // Загружает все измерения дерева-приёмника
    loadDestTree() {
        om.common.requestInfo().logStatusMessage(`Load destination tree`, true);
        ENV.DESTINATION_INFO.DIMENSION_MAP.forEach((params, index) => {
            this.loadDestList(index, params);
        });
    }

    // Сравнивает в обе стороны деревья источника и приёмника,
    // устанавливает связи между одинаковыми элементами
    connectDestToSourceTree() {
        om.common.requestInfo().logStatusMessage(
            `Cross join source and destination trees`,
            true
        );
        let counters = {
            ignoreItems: 0,
            oldItems: 0,
            newItems: 0,
            existItems: 0,
            freeItems: this.destTree.getFreeItemIdentifiers().length
        };
        this.destTree.tree.forEach((/**DestTreeItem*/item) => {
            let identifier = item.getIdentifier();
            if (!identifier) {
                counters.ignoreItems++;
                return;
            }
            let sourceItem = this.sourceTree.getItem(identifier);
            if (!sourceItem) {
                if (this.dimensionMapManager.canUpdate(item)) {
                    counters.oldItems++;
                } else {
                    counters.ignoreItems++;
                }
                return;
            }
            this.destTree.setCrossRelation(item, sourceItem);
            counters.existItems++;
        });
        this.sourceTree.tree.forEach((/**SourceTreeItem*/item) => {
            const hasLevel = this.dimensionMapManager.hasLevel(item.getLevelIndex());
            item.setHasLevel(hasLevel);
            if (!item.getRelationItem() && hasLevel) {
                if (this.dimensionMapManager.canUpdate(item)) {
                    counters.newItems++;
                } else {
                    counters.ignoreItems++;
                }
            }
        });
        let message = [
            `Found ${counters.existItems} existing intersections between source and destination`,
            `Found ${counters.newItems} addable items`,
            `Found ${counters.oldItems} old items`,
            `Found ${counters.ignoreItems} ignorable items`,
            `Found ${counters.freeItems} free items`,
        ];
        om.common.requestInfo().logStatusMessage(
            message.join("\n"),
            true
        );
    }

    // Общая функция управления элементами
    manageDestItems(manageCollection) {
        this.destTree.tree.forEach((item) => {
            manageCollection[item.getLevelIndex()].appendItem(item);
        });
        manageCollection.forEach(manager => {
            manager.apply();
        });
    }

    // Управляет старыми элементами приёмника
    manageOldDestItems() {
        om.common.requestInfo().logStatusMessage(`Managing old destination items`, true);
        this.manageDestItems(
            this.dimensionMapManager.getDimensionDeleterCollection()
        );
    }

    // Управляет существующими элементами приёмника
    manageExistDestItems() {
        om.common.requestInfo().logStatusMessage(`Managing existing destination items`, true);
        this.manageDestItems(
            this.dimensionMapManager.getDimensionUpdaterCollection()
        );
    }

    // Управляет новыми элементами, которых нет в приёмнике
    manageNewDestItems() {
        om.common.requestInfo().logStatusMessage(`Adding new destination items`, true);
        let manageCollection = this.dimensionMapManager.getDimensionCreatorCollection();
        this.sourceTree.tree.forEach(item => {
            manageCollection[item.getLevelIndex()].appendItem(item);
        });
        manageCollection.forEach(/**DimensionCreatorManager*/manager => {
            manager.setSourceTree(this.sourceTree);
            manager.setDestTree(this.destTree);
            manager.apply();
        });
    }

    // Обновляет столбец RELATION_CUBE_NAME
    updateSourceRelationColumn() {
        this.sourceTree.updateSourceRelationColumn();
    }

    applyCellBufferManager() {
        // Принимаем клетки в буфере клеток
        this.cellBufferManager.apply();
    }

    load() {
        if (!om.common.modelInfo().autoCalcStatus()) {
            // Данный скрипт теперь может при ошибках в менеджере буферов клеток
            // поломать состояние автоматического пересчета клеток,
            // нужно защитить скрипт от этого на старте
            throw new Error('Model manual recalculation mode enabled');
        }
        this.loadSourceTree();
        this.loadDestTree();
        this.connectDestToSourceTree();
        this.manageOldDestItems();
        this.manageExistDestItems();
        this.manageNewDestItems();
        this.applyCellBufferManager();
        this.updateSourceRelationColumn();
    }
}

(new Macros).load();
