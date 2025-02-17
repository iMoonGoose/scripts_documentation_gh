# MongoDB

Все интерфейсы этого раздела находятся в пространстве имён `Mongodb`.

&nbsp;

### Интерфейс ConnectorBuilder<a name="ConnectorBuilder"></a>
```ts
interface ConnectorBuilder {
	setDSN(value: string): ConnectorBuilder;
	setDatabase(value: string): ConnectorBuilder;
	load(): Connection;
}
```
Интерфейс, реализующий шаблон проектирования [`строитель`](https://ru.wikipedia.org/wiki/%D0%A1%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D1%8C_(%D1%88%D0%B0%D0%B1%D0%BB%D0%BE%D0%BD_%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F)), для настройки подключения к [`MongoDB`](https://ru.wikipedia.org/wiki/MongoDB).

&nbsp;

```js
setDSN(value: string): ConnectorBuilder
```
Устанавливает [`DSN`](https://docs.mongodb.com/bi-connector/master/tutorial/create-system-dsn/) для подключения. Возвращает `this`.

&nbsp;

```js
setDatabase(value: string): ConnectorBuilder
```
Устанавливает имя базы данных. Возвращает `this`.

&nbsp;

```js
load(): Connection
```
Создаёт соединение с БД и возвращает его интерфейс [`Connection`](#Connection).

&nbsp;

### Интерфейс Connection<a name="Connection"></a>
```ts
interface Connection {
	collectionCreator(): CollectionCreator;
	dropCollection(name: string): Object;
	selectCollection(name: string): Collection;
	types(): Types;
}
```
Интерфейс соединения с MongoDB.

&nbsp;

```js
collectionCreator(): CollectionCreator
```
Возвращает интерфейс создания коллекции [`CollectionCreator`](#CollectionCreator).

&nbsp;

```js
dropCollection(name: string): Object
```
Передаёт в MongoDB запрос на [`удаление коллекции`](https://docs.mongodb.com/manual/reference/method/db.collection.drop/) `name`, дожидается завершения обработки и возвращает объект результата.

&nbsp;

```js
selectCollection(name: string): Collection
```
Возвращает интерфейс [`Collection`](#Collection) работы с коллекцией `name`.

&nbsp;

```js
types(): Types
```
Возвращает вспомогательный интерфейс [`Types`](#Types).

&nbsp;

### Интерфейс CollectionCreator<a name="CollectionCreator"></a>
```ts
interface CollectionCreator {
	setOptions(options: Object): CollectionCreator;

	setName(name: string): CollectionCreator;
	create(): { ok: number, errmsg?: string };
}
```
Интерфейс, реализующий шаблон проектирования [`строитель`](https://ru.wikipedia.org/wiki/%D0%A1%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D1%8C_(%D1%88%D0%B0%D0%B1%D0%BB%D0%BE%D0%BD_%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F)), для создания коллекции MongoDB. Все функции, кроме `create()`, возвращают `this`.

&nbsp;

```js
setOptions(options: Object): CollectionCreator
```
Устанавливает опции коллекции. Их полный набор и описание см. в [`документации`](https://docs.mongodb.com/manual/reference/method/db.createCollection) к MongoDB.

&nbsp;

```js
setName(name: string): CollectionCreator
```
Устанавливает имя коллекции.

&nbsp;

```js
create(): { ok: number, errmsg?: string }
```
Передаёт в MongoDB запрос на создание коллекции, дожидается завершения обработки и возвращает объект результата.

&nbsp;

### Интерфейс Collection<a name="Collection"></a>
```ts
interface Collection {
	count(filter: Object): number;
	find(filter: Object, options?: FilterOptions): Cursor;
	findOne(filter: Object, options?: FilterOptions): Object;
	insertOne(document: Object): InsertOneResult;
	insertMany(documents: Object[]): InsertManyResult;
	updateOne(filter: Object, update: Object, options?: FilterOptions): UpdateResult;
	updateMany(filter: Object, update: Object, options?: FilterOptions): UpdateResult;
	deleteOne(filter: Object, options?: FilterOptions): DeleteResult;
	deleteMany(filter: Object, options?: FilterOptions): DeleteResult;
}
```
Интерфейс работы с коллекцией MongoDB.

Большинство функций принимают параметры `filter` и `options`, имеющие везде одно и то же значение.

`filter` – фильтр (или запрос) данных коллекции. Подробнее о принципах его построения см. в [`документации`](https://docs.mongodb.com/manual/reference/method/db.collection.find/) (параметр `query`).

`options` – опции запроса [`FilterOptions`](#FilterOptions).

&nbsp;

```js
count(filter: Object): number
```
Возвращает количество документов коллекции, соответствующих запросу `filter`.

&nbsp;

```js
find(filter: Object, options?: FilterOptions): Cursor
```
Передаёт в MongoDB запрос [`find()`](https://docs.mongodb.com/manual/reference/method/db.collection.find/) поиска документов и возвращает [`Cursor`](#Cursor).

&nbsp;

```js
findOne(filter: Object, options?: FilterOptions): Object
```
Передаёт в MongoDB запрос [`findOne()`](https://docs.mongodb.com/manual/reference/method/db.collection.findOne/) поиска одного документа и возвращает найденный документ.

&nbsp;

<a name="insertOne"></a>
```js
insertOne(document: Object): InsertOneResult
```
Передаёт в MongoDB запрос [`insertOne()`](https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/) добавления одного документа `document` в коллекцию и возвращает интерфейс [`InsertOneResult`](#InsertOneResult) доступа к результатам этого запроса.

&nbsp;

<a name="insertMany"></a>
```js
insertMany(documents: Object[]): InsertManyResult
```
Передаёт в MongoDB запрос [`insertMany()`](https://docs.mongodb.com/manual/reference/method/db.collection.insertMany/) добавления массива документов `documents` в коллекцию и возвращает интерфейс [`InsertManyResult`](#InsertManyResult) доступа к результатам этого запроса.

&nbsp;

<a name="updateOne"></a>
```js
updateOne(filter: Object, update: Object, options?: FilterOptions): UpdateResult
```
Передаёт в MongoDB запрос [`updateOne()`](https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/) изменения объектом `update` одного документа, определяемого запросом `filter`, и возвращает интерфейс [`UpdateResult`](#UpdateResult) доступа к результатам этого запроса.

&nbsp;

<a name="updateMany"></a>
```js
updateMany(filter: Object, update: Object, options?: FilterOptions): UpdateResult
```
Передаёт в MongoDB запрос [`updateMany()`](https://docs.mongodb.com/manual/reference/method/db.collection.updateMany/) изменения объектом `update` нескольких документов, определяемых запросом `filter`, и возвращает интерфейс [`UpdateResult`](#UpdateResult) доступа к результатам этого запроса.

&nbsp;

<a name="deleteOne"></a>
```js
deleteOne(filter: Object, options?: FilterOptions): DeleteResult
```
Передаёт в MongoDB запрос [`deleteOne()`](https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne/) удаления одного документа, определяемого запросом `filter`, и возвращает интерфейс [`DeleteResult`](#DeleteResult) доступа к результатам этого запроса.

&nbsp;

<a name="deleteMany"></a>
```js
deleteMany(filter: Object, options?: FilterOptions): DeleteResult
```
Передаёт в MongoDB запрос [`deleteMany()`](https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany/) удаления нескольких документов, определяемых запросом `filter`, и возвращает интерфейс [`DeleteResult`](#DeleteResult) доступа к результатам этого запроса.

&nbsp;

### Интерфейс InsertOneResult<a name="InsertOneResult"></a>
```ts
interface InsertOneResult {
	getInsertedCount(): number;
	getInsertedId(): Types.ObjectId;
	isAcknowledged(): boolean;
}
```
Интерфейс доступа к данным, возвращаемым MongoDB в ответ на запрос функцией[`insertOne()`](#insertOne).

&nbsp;

```js
getInsertedCount(): number
```
Возвращает количество вставленных документов. Как правило, это `0` или `1`.

&nbsp;

```js
getInsertedId(): Types.ObjectId
```
Возвращает [`Types.ObjectId`](#Types.ObjectId) вставленного документа.

&nbsp;

<a name="InsertOneResult.isAcknowledged"></a>
```js
isAcknowledged(): boolean
```
Возвращает признак запуска операции с [`write concern`](https://docs.mongodb.com/manual/reference/glossary/#std-term-write-concern).

&nbsp;

### Интерфейс InsertManyResult<a name="InsertManyResult"></a>
```ts
interface InsertManyResult {
	getInsertedCount(): number;
	getInsertedIds(): Types.ObjectId[];
	isAcknowledged(): boolean;
}
```
Интерфейс доступа к данным, возвращаемым MongoDB в ответ на запрос функцией[`insertMany()`](#insertMany).

&nbsp;

```js
getInsertedCount(): number
```
Возвращает количество вставленных документов.

&nbsp;

```js
getInsertedIds(): Types.ObjectId[]
```
Возвращает массив [`Types.ObjectId`](#Types.ObjectId) вставленных документов.

&nbsp;

```js
isAcknowledged(): boolean
```
То же, что и [`InsertOneResult.isAcknowledged()`](#InsertOneResult.isAcknowledged).

&nbsp;

### Интерфейс UpdateResult<a name="UpdateResult"></a>
```ts
interface UpdateResult {
	getMatchedCount(): number;
	getModifiedCount(): number;
	getUpsertedCount(): number;
	getUpsertedId(): Types.ObjectId;
	isAcknowledged(): boolean;
}
```
Интерфейс доступа к данным, возвращаемым MongoDB в ответ на запрос функциями[`updateOne()`](#updateOne) и [`updateMany()`](#updateMany).

&nbsp;

```js
getMatchedCount(): number
```
Возвращает количество найденных по фильтру `filter` документов.

&nbsp;

```js
getModifiedCount(): number
```
Возвращает количество модифицированных документов.

&nbsp;

```js
getUpsertedCount(): number
```
Возвращает количество документов, вставленных по опции [`upsert`](https://docs.mongodb.com/manual/reference/method/db.collection.update/#std-label-upsert-behavior).

&nbsp;

```js
getUpsertedId(): Types.ObjectId
```
Возвращает [`Types.ObjectId`](#Types.ObjectId) документа, вставленного по опции [`upsert`](https://docs.mongodb.com/manual/reference/method/db.collection.update/#std-label-upsert-behavior).

&nbsp;

```js
isAcknowledged(): boolean
```
То же, что и [`InsertOneResult.isAcknowledged()`](#InsertOneResult.isAcknowledged).

&nbsp;

### Интерфейс DeleteResult<a name="DeleteResult"></a>
```ts
interface DeleteResult {
	getDeletedCount(): number;
	isAcknowledged(): boolean;
}
```
Интерфейс доступа к данным, возвращаемым MongoDB в ответ на запрос функциями[`deleteOne()`](#deleteOne) и [`deleteMany()`](#deleteMany).

&nbsp;

```js
getDeletedCount(): number
```
Возвращает количество удалённых документов.

&nbsp;

```js
isAcknowledged(): boolean
```
То же, что и [`InsertOneResult.isAcknowledged()`](#InsertOneResult.isAcknowledged).

&nbsp;

### Интерфейс Cursor<a name="Cursor"></a>
```ts
interface Cursor {
	all(): Object[];
	generator(): Object[];
}
```
Курсор ответных данных на запрос к MongoDB.

&nbsp;

```js
all(): Object[]
```
Возвращает все документы ответа в виде массива.

&nbsp;

```js
generator(): Object[]
```
Возвращает генератор, перебирающий все документы ответа.

&nbsp;

### Интерфейс FilterOptions<a name="FilterOptions"></a>
```ts
interface FilterOptions extends Object {
	sort: Object,
	skip: number,
	limit: number,
	showRecordId: boolean,
	min: Object,
	max: Object
}
```
Интерфейс опций запроса к MongoDB. Наследуется от [`Object`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Object).

&nbsp;

```js
sort: Object
```
Задаёт сортировку возвращаемых данных. Подробнее см. в [`документации`](https://docs.mongodb.com/manual/reference/method/cursor.sort).

&nbsp;

```js
skip: number
```
Предписывает пропустить первые `skip` документов ответа. Подробнее см. в [`документации`](https://docs.mongodb.com/manual/reference/method/cursor.skip).

&nbsp;

```js
limit: number
```
Ограничивает количество возвращаемых документов. Подробнее см. в [`документации`](https://docs.mongodb.com/manual/reference/method/cursor.limit).

&nbsp;

```js
showRecordId: boolean
```
Добавляет `$recordId` в результаты запроса. Подробнее см. в [`документации`](https://docs.mongodb.com/manual/reference/method/cursor.showRecordId).

&nbsp;

```js
min: Object
```
Устанавливает нижнюю грань для указанных полей, по которым построен числовой индекс. 
Подробнее см. в [`документации`](https://docs.mongodb.com/manual/reference/method/cursor.min).

&nbsp;

```js
max: Object
```
Устанавливает верхнюю грань для указанных полей, по которым построен числовой индекс. 
Подробнее см. в [`документации`](https://docs.mongodb.com/manual/reference/method/cursor.max).

&nbsp;

### Интерфейс Types<a name="Types"></a>
```ts
interface Types {
	ObjectId(id?: string): Types.ObjectId;
	regex(pattern: string, flags?: string): Object;
	date(milliseconds: number): Object;
}
```
Вспомогательный интерфейс для конверсии типов.

&nbsp;

```js
ObjectId(id?: string): Types.ObjectId
```
Без аргументов генерирует и возвращает новый [`Types.ObjectId`](#Types.ObjectId). В случае с переданным `id` преобразует его в тип [`Types.ObjectId`](#Types.ObjectId) и возвращает. 

&nbsp;

```js
regex(pattern: string, flags?: string): Object
```
Принимает [`регулярное выражение`](https://ru.wikipedia.org/wiki/%D0%A0%D0%B5%D0%B3%D1%83%D0%BB%D1%8F%D1%80%D0%BD%D1%8B%D0%B5_%D0%B2%D1%8B%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F) `pattern` и набор флагов `flags` и возвращает объект регулярного выражения для работы в MongoDB.

&nbsp;

```js
date(milliseconds: number): Object
```
Принимает количество ***миллисекунд***, прошедших с начала эпохи (в отличие от времени [`UNIX`](https://ru.wikipedia.org/wiki/Unix-%D0%B2%D1%80%D0%B5%D0%BC%D1%8F), которое использует количество ***секунд***) и возвращает объект даты для использования в MongoDB.

&nbsp;

### Интерфейс Types.ObjectId<a name="Types.ObjectId"></a>
```ts
namespace Types {
	interface ObjectId {
		toString(): string;
	}
}
```
Интерфейс-аналог внутреннего для MongoDB типа [`ObjectId`](https://docs.mongodb.com/manual/reference/method/ObjectId/).

&nbsp;

```js
toString(): string
```
Возвращает строковое представление `ObjectId`.

&nbsp;

[API Reference](API.md)

[Оглавление](../README.md)