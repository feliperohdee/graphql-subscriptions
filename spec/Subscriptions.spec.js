const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const lazyExecutor = require('smallorange-graphql-lazy-executor');
const {
    Observable
} = require('rxjs');

const {
    type,
    namespace,
    queries,
    schema,
    noSubscriptionSchema
} = require('../testing');
const {
    Subscriptions
} = require('../');

chai.use(sinonChai);

const expect = chai.expect;

describe('Subscriptions.js', () => {
    let subscriptions;

    beforeEach(() => {
        subscriptions = new Subscriptions(schema);
    });

    describe('constructor', () => {
        it('should throw if no schema', () => {
            expect(() => new Subscriptions()).to.throw('No GraphQL schema provided');
        });

        it('should feed schema', () => {
            expect(subscriptions.schema).to.be.an('object');
        });

        it('should feed default concurrency', () => {
            expect(subscriptions.concurrency).to.equal(Number.MAX_SAFE_INTEGER);
        });

        it('should feed custom concurrency', () => {
            subscriptions = new Subscriptions(schema, 4);
            expect(subscriptions.concurrency).to.equal(4);
        });

        it('should feed stream', () => {
            expect(subscriptions.stream).to.be.an('object');
        });

        describe('stream', () => {
            it('should do nothing if no namespace', done => {
                const result = [];

                subscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe({}, namespace, type, queries[1], {
                    name: 'Rohde'
                });

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run();
            });

            it('should do nothing if namespace not found', done => {
                const result = [];

                subscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe({}, namespace, type, queries[1], {
                    name: 'Rohde'
                });

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace + 1, type);
            });

            it('should do nothing if no type', done => {
                const result = [];

                subscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe({}, namespace, type, queries[1], {
                    name: 'Rohde'
                });

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace);
            });

            it('should do nothing if type not found', done => {
                const result = [];

                subscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe({}, namespace, type, queries[1], {
                    name: 'Rohde'
                });

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace, type + 1);
            });

            it('should handle query error', done => {
                subscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe({}, namespace, type, queries[1]);

                subscriptions.stream
                    .subscribe(null, err => {
                        expect(err.message).to.equal('Variable "$name" of required type "String!" was not provided.');
                        done();
                    });

                subscriptions.run(namespace, type);
            });

            it('should handle no queries', done => {
                const result = [];

                subscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe({}, namespace, type, queries[1]);

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace, type + 1);
            });

            it('should run queries', done => {
                const ref1 = {};
                const ref2 = {};
                const ref3 = {};
                const ref4 = {};

                const sub1 = subscriptions.subscribe(ref1, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                const sub2 = subscriptions.subscribe(ref2, namespace, type, queries[1], {
                    name: 'Rohde'
                });

                const sub3 = subscriptions.subscribe(ref3, namespace + 1, type, queries[1], {
                    name: 'Rohde'
                });

                const sub4 = subscriptions.subscribe(ref4, namespace, type + 1, queries[1], {
                    name: 'Rohde'
                });

                const sub1Refs = _.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}.subscribers`);
                const sub2Refs = _.get(subscriptions.subscriptions, `${namespace}.${type}.${sub2}.subscribers`);
                const sub3Refs = _.get(subscriptions.subscriptions, `${namespace}.${type}.${sub3}.subscribers`);
                const sub4Refs = _.get(subscriptions.subscriptions, `${namespace}.${type}.${sub4}.subscribers`);

                subscriptions.stream
                    .take(3)
                    .toArray()
                    .subscribe(response => {
                        expect(response).to.deep.equal([{
                            args: {
                                age: undefined,
                                city: undefined,
                                name: 'Rohde',
                            },
                            hash: 'eea94b2335eb866301de6bb89d564cea',
                            namespace: 'namespace',
                            operationName: 'changeUser',
                            query: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            root: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: sub1Refs,
                            type: 'type',
                            variables: {
                                name: 'Rohde'
                            }
                        }, {
                            args: {
                                age: undefined,
                                city: undefined,
                                name: 'Rohde',
                            },
                            hash: '9c7aef8b73b41818d7b10c9c685cd82c',
                            namespace: 'namespace',
                            operationName: 'changeUser',
                            query: {
                                data: {
                                    user: {
                                        age: 20,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            root: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: sub2Refs,
                            type: 'type',
                            variables: {
                                name: 'Rohde'
                            }
                        }, {
                            args: {
                                age: undefined,
                                city: undefined,
                                name: 'Rohde',
                            },
                            hash: '9c7aef8b73b41818d7b10c9c685cd82c',
                            namespace: 'namespace1',
                            operationName: 'changeUser',
                            query: {
                                data: {
                                    user: {
                                        age: 20,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            root: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: sub3Refs,
                            type: 'type',
                            variables: {
                                name: 'Rohde'
                            }
                        }]);
                    }, null, done);

                subscriptions.run(namespace, type, {
                    age: 20
                });

                subscriptions.run(namespace + 1, type, {
                    age: 20
                });
            });
        });
    });

    describe('run', () => {
        beforeEach(() => {
            sinon.spy(subscriptions.inbound, 'next');
        });

        afterEach(() => {
            subscriptions.inbound.next.restore();
        });

        it('should call inbound.next with default root and context', () => {
            subscriptions.run(namespace, type);
            expect(subscriptions.inbound.next).to.have.been.calledWith({
                type,
                namespace,
                root: {},
                context: {}
            });
        });

        it('should call inbound.next with custom root ans context', () => {
            subscriptions.run(namespace, type, {
                root: 'root'
            }, {
                context: 'context'
            });

            expect(subscriptions.inbound.next).to.have.been.calledWith({
                type,
                namespace,
                root: {
                    root: 'root'
                },
                context: {
                    context: 'context'
                }
            });
        });
    });

    describe('subscribe', () => {
        beforeEach(() => {
            sinon.spy(subscriptions, 'extractQueryData');
        });

        afterEach(() => {
            subscriptions.extractQueryData.restore();
        });

        it('should do nothing if no subscriber', () => {
            expect(subscriptions.subscribe()).to.be.undefined;
            expect(subscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no namespace', () => {
            expect(subscriptions.subscribe({})).to.be.undefined;
            expect(subscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no type', () => {
            expect(subscriptions.subscribe({}, namespace)).to.be.undefined;
            expect(subscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no query', () => {
            expect(subscriptions.subscribe({}, namespace, type)).to.be.undefined;
            expect(subscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should throw if subscriber not object', () => {
            expect(() => subscriptions.subscribe('string', namespace, type, `subscription {user{name}}`)).to.throw('Subscriber must be an object');
        });

        it('should throw if no operationName', () => {
            expect(() => subscriptions.subscribe({}, namespace, type, `subscription {user{name}}`)).to.throw('GraphQLError: Small Orange subscriptions must have an operationName');
        });

        it('should throw if multiple roots', () => {
            expect(() => subscriptions.subscribe({}, namespace, type, `subscription changeUser{user{name} user{name}}`)).to.throw('GraphQLError: Subscription "changeUser" must have only one field.');
        });

        it('should throw if fragments', () => {
            expect(() => subscriptions.subscribe({}, namespace, type, `
                subscription changeUser {
                    ...userInfo
                }

                fragment userInfo on SubscriptionType {
                    user {
                        name
                    }
                }
            `)).to.throw('GraphQLError: Small Orange subscriptions do not support fragments on the root field');
        });

        it('should return hash based on query and variables', () => {
            const sub1 = subscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub2 = subscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub3 = subscriptions.subscribe({}, namespace, type, queries[1], {
                age: 20
            });

            const sub4 = subscriptions.subscribe({}, namespace, type, queries[1], {
                age: 21
            });

            expect(sub1).to.equal('ee108784308025e4f58051b7d7347319');
            expect(sub2).to.equal('ee108784308025e4f58051b7d7347319');
            expect(sub3).to.equal('c483a253b7fc2dba1452b11e6bce3077');
            expect(sub4).to.equal('9c7b68de7cb7c3cdd66b86327ad3fc60');
            expect(sub1).to.equal(sub2);
            expect(sub2).not.to.equal(sub3);
            expect(sub3).not.to.equal(sub4);
        });

        it('should create subscriptions', () => {
            const sub1 = subscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}.executor`)).to.be.a('function');
            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}.subscribers`)).to.be.a('Set');
        });

        it('should add subscribers', () => {
            const subscribe1 = ref => subscriptions.subscribe(ref, namespace, type, queries[0]);
            const subscribe2 = ref => subscriptions.subscribe(ref, namespace, type, queries[1]);

            const ref1 = {};
            const sub1 = subscribe1(ref1);

            const ref2 = {};
            const sub2 = subscribe1(ref2);
            const sub2_1 = subscribe2(ref2);

            const ref3 = {};
            const sub3 = subscribe2(ref3);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}.subscribers`).size).to.equal(2);
            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub2}.subscribers`).size).to.equal(2);
            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub3}.subscribers`).size).to.equal(2);

            expect(_.get(ref1, subscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub1}`)).to.be.true;
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(1);
            expect(_.get(ref2, subscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub2}`)).to.be.true;
            expect(_.get(ref2, subscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub2_1}`)).to.be.true;
            expect(_.get(ref2, subscriptions.subscribedSymbol).size).to.equal(2);
            expect(_.get(ref3, subscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub3}`)).to.be.true;
            expect(_.get(ref3, subscriptions.subscribedSymbol).size).to.equal(1);
        });

        it('should reuse shallow identic queries', () => {
            const sub1 = subscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub2 = subscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.equal(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub2}`));
            expect(_.size(_.get(subscriptions.subscriptions, `${namespace}.${type}`))).to.equal(1);
        });

        it('should not reuse shallow different queries', () => {
            const sub1 = subscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub2 = subscriptions.subscribe({}, namespace, type, queries[1], {
                age: 20
            });

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).not.to.equal(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub2}`));
            expect(_.size(_.get(subscriptions.subscriptions, `${namespace}.${type}`))).to.equal(2);
        });
    });

    describe('unsubscribe', () => {
        const subscribe1 = ref => subscriptions.subscribe(ref, namespace, type, queries[0]);
        const subscribe2 = ref => subscriptions.subscribe(ref, namespace, type, queries[1]);
        let ref1;
        let sub1;
        let ref2;
        let sub2;
        let sub2_1;

        beforeEach(() => {
            ref1 = {};
            sub1 = subscribe1(ref1);
            ref2 = {};
            sub2 = subscribe1(ref2);
            sub2_1 = subscribe2(ref2);
        });

        it('should do nothing if no subscriber', () => {
            expect(subscriptions.unsubscribe()).to.be.undefined;
        });

        it('should throw if subscriber not object', () => {
            expect(() => subscriptions.unsubscribe('string')).to.throw('Subscriber must be an object');
        });

        it('should do nothing if no subscriber subscriptions', () => {
            expect(subscriptions.unsubscribe({})).to.be.undefined;
        });

        it('should unsubscribe ref1 and return true', () => {
            expect(subscriptions.unsubscribe(ref1)).to.be.true;
        });

        it('should unsubscribe ref1 and dont remove subscribe1 from subscriptions', () => {
            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(1);

            subscriptions.unsubscribe(ref1);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(0);
        });

        it('should unsubscribe ref1 and ref2 and remove subscribe1 from subscriptions', () => {
            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(1);
            expect(_.get(ref2, subscriptions.subscribedSymbol).size).to.equal(2);

            subscriptions.unsubscribe(ref1);
            subscriptions.unsubscribe(ref2);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(0);
            expect(_.get(ref2, subscriptions.subscribedSymbol).size).to.equal(0);
        });

        it('should unsubscribe ref1 only by namespace', () => {
            sub1 = subscriptions.subscribe(ref1, namespace + 1, type, queries[0]);
            sub2 = subscriptions.subscribe(ref1, namespace + 1, type, queries[1]);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(subscriptions.subscriptions, `${namespace + 1}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(3);

            subscriptions.unsubscribe(ref1, namespace + 1);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(subscriptions.subscriptions, `${namespace + 1}.${type}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(1);
        });

        it('should unsubscribe ref1 only by namespace and type', () => {
            sub1 = subscriptions.subscribe(ref1, namespace + 1, type + 1, queries[0]);
            sub2 = subscriptions.subscribe(ref1, namespace + 1, type + 1, queries[1]);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(subscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(3);

            subscriptions.unsubscribe(ref1, namespace + 1, type + 1);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(subscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(1);
        });

        it('should unsubscribe ref1 only by namespace, type and hash', () => {
            sub1 = subscriptions.subscribe(ref1, namespace + 1, type + 1, queries[0]);
            sub2 = subscriptions.subscribe(ref1, namespace + 1, type + 1, queries[1]);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(subscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(3);

            subscriptions.unsubscribe(ref1, namespace + 1, type + 1, sub1);

            expect(_.get(subscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(subscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(2);
        });
    });

    describe('extractQueryData', () => {
        it('should extract query data', () => {
            const executor = lazyExecutor(schema, queries[0]);

            expect(subscriptions.extractQueryData(schema, executor.parsedQuery, {
                name: 'Rohde',
                age: 20,
                city: 'San Francisco',
                unknownVariable: null
            })).to.deep.equal([{
                args: {
                    name: 'Rohde',
                    age: 20,
                    city: 'San Francisco'
                },
                operationName: 'changeUser',
                rootAlias: null,
                rootName: 'user'
            }]);
        });

        it('should return null if no subscription type', () => {
            const executor = lazyExecutor(noSubscriptionSchema, queries[0]);

            expect(subscriptions.extractQueryData(noSubscriptionSchema, executor.parsedQuery, {
                name: 'Rohde',
                age: 20,
                city: 'San Francisco',
                unknownVariable: null
            })).to.be.null;
        });
    });
});
