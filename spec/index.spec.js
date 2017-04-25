const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const {
    Observable
} = require('rxjs');
const {
    execute,
    parse,
    printSchema
} = require('graphql');

const {
    event,
    events,
    namespace,
    queries,
    schema,
    noSubscriptionSchema
} = require('../testing');
const Subscriptions = require('../');

chai.use(sinonChai);

const expect = chai.expect;

describe.only('index.js', () => {
    let subscriptions;

    beforeEach(() => {
        subscriptions = new Subscriptions(schema, events);
    });

    describe('constructor', () => {
        it('should throw if no schema', () => {
            expect(() => new Subscriptions()).to.throw('No GraphQL schema provided.');
        });

        it('should feed schema', () => {
            expect(subscriptions.schema).to.be.an('object');
        });

        it('should parse schema if string provided', () => {
            subscriptions = new Subscriptions(printSchema(schema));
            expect(subscriptions.schema).to.be.an('object');
        });

        it('should feed default concurrency', () => {
            expect(subscriptions.concurrency).to.equal(Number.MAX_SAFE_INTEGER);
        });

        it('should feed custom executor', () => {
            const customExecutor = () => null;
            subscriptions = new Subscriptions(schema, events, customExecutor, 4);

            expect(subscriptions.customExecutor).to.equal(customExecutor);
        });

        it('should feed custom concurrency', () => {
            subscriptions = new Subscriptions(schema, events, null, 4);
            expect(subscriptions.concurrency).to.equal(4);
        });

        it('should feed stream', () => {
            expect(subscriptions.stream).to.be.an('object');
        });

        describe('stream', () => {
            it('should do nothing if no namespace', done => {
                const result = [];

                subscriptions.subscribe(namespace, {}, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(namespace, {}, queries[1], {
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

                subscriptions.subscribe(namespace, {}, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(namespace, {}, queries[1], {
                    name: 'Rohde'
                });

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace + 1, event);
            });

            it('should do nothing if no event', done => {
                const result = [];

                subscriptions.subscribe(namespace, {}, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(namespace, {}, queries[1], {
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

            it('should do nothing if event not found', done => {
                const result = [];

                subscriptions.subscribe(namespace, {}, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(namespace, {}, queries[1], {
                    name: 'Rohde'
                });

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace, event + 1);
            });

            it('should handle query error', done => {
                subscriptions.subscribe(namespace, {}, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(namespace, {}, queries[1]);

                subscriptions.stream
                    .subscribe(null, err => {
                        expect(err.message).to.equal('Variable "$name" of required type "String!" was not provided.');
                        done();
                    });

                subscriptions.run(namespace, event);
            });

            it('should handle no queries', done => {
                const result = [];

                subscriptions.subscribe(namespace, {}, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(namespace, {}, queries[1]);

                subscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                subscriptions.run(namespace, event + 1);
            });

            it('should run queries', done => {
                const ref1 = {};
                const ref2 = {};
                const ref3 = {};
                const ref4 = {};

                const sub1 = subscriptions.subscribe(namespace, ref1, queries[0], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                const sub2 = subscriptions.subscribe(namespace, ref2, queries[1], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                const sub3 = subscriptions.subscribe(namespace, ref3, queries[2], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                const sub4 = subscriptions.subscribe(namespace, ref4, queries[3], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                subscriptions.stream
                    .take(5)
                    .toArray()
                    .subscribe(response => {
                        expect(response[0].subscribers.has(ref1)).to.be.true;
                        expect(response[0]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'event',
                            hash: '69ad83b324531f979aca7a56cc32047c',
                            namespace: 'namespace',
                            operationName: 'changeUser',
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[0].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[1].subscribers.has(ref2)).to.be.true;
                        expect(response[1]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'event',
                            hash: '84e15e7de349e804f7ec7db0dfe91c03',
                            namespace: 'namespace',
                            operationName: null,
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[1].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[2].subscribers.has(ref3)).to.be.true;
                        expect(response[2]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'event',
                            hash: '4c5db9f456b132e72f77939b2d322796',
                            namespace: 'namespace',
                            operationName: null,
                            result: {
                                data: {
                                    userWithSingleEvent: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'userWithSingleEvent',
                            subscribers: response[2].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[3].subscribers.has(ref1)).to.be.true;
                        expect(response[3]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'anotherEvent',
                            hash: '69ad83b324531f979aca7a56cc32047c',
                            namespace: 'namespace',
                            operationName: 'changeUser',
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[3].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[4].subscribers.has(ref2)).to.be.true;
                        expect(response[4]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'anotherEvent',
                            hash: '84e15e7de349e804f7ec7db0dfe91c03',
                            namespace: 'namespace',
                            operationName: null,
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[4].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });
                    }, null, done);

                subscriptions.run('inexistentNamespace', event, {
                    age: 20
                }, {
                    auth2: {}
                });

                subscriptions.run(namespace, 'inexistentEvent', {
                    age: 20
                }, {
                    auth2: {}
                });

                subscriptions.run(namespace, event, {
                    age: 20
                }, {
                    auth2: {}
                });

                subscriptions.run(namespace, 'anotherEvent', {
                    age: 20
                }, {
                    auth2: {}
                });
            });

            it('should run queries with custom executor', done => {
                const customExecutorStub = sinon.stub();
                const customExecutor = (...args) => Observable.fromPromise(execute.apply(null, args))
                    .do(customExecutorStub);

                subscriptions = new Subscriptions(schema, events, customExecutor);

                const ref1 = {};
                const ref2 = {};
                const ref3 = {};
                const ref4 = {};

                const sub1 = subscriptions.subscribe(namespace, ref1, queries[0], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                const sub2 = subscriptions.subscribe(namespace, ref2, queries[1], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                const sub3 = subscriptions.subscribe(namespace, ref3, queries[2], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                const sub4 = subscriptions.subscribe(namespace, ref4, queries[3], {
                    name: 'Rohde'
                }, {
                    auth: {}
                });

                subscriptions.stream
                    .take(5)
                    .toArray()
                    .subscribe(response => {
                        expect(customExecutorStub).to.have.been.callCount(5);
                        expect(customExecutorStub).to.have.been.calledWith({
                            data: {
                                user: {
                                    age: 20,
                                    city: null,
                                    name: 'Rohde'
                                }
                            }
                        });

                        expect(customExecutorStub).to.have.been.calledWith({
                            data: {
                                userWithSingleEvent: {
                                    age: 20,
                                    city: null,
                                    name: 'Rohde'
                                }
                            }
                        });

                        expect(customExecutorStub).to.have.been.calledWith({
                            data: {
                                user: {
                                    age: 20,
                                    city: null,
                                    name: 'Rohde'
                                }
                            }
                        });


                        expect(response[0].subscribers.has(ref1)).to.be.true;
                        expect(response[0]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'event',
                            hash: '69ad83b324531f979aca7a56cc32047c',
                            namespace: 'namespace',
                            operationName: 'changeUser',
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[0].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[1].subscribers.has(ref2)).to.be.true;
                        expect(response[1]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'event',
                            hash: '84e15e7de349e804f7ec7db0dfe91c03',
                            namespace: 'namespace',
                            operationName: null,
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[1].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[2].subscribers.has(ref3)).to.be.true;
                        expect(response[2]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'event',
                            hash: '4c5db9f456b132e72f77939b2d322796',
                            namespace: 'namespace',
                            operationName: null,
                            result: {
                                data: {
                                    userWithSingleEvent: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'userWithSingleEvent',
                            subscribers: response[2].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[3].subscribers.has(ref1)).to.be.true;
                        expect(response[3]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'anotherEvent',
                            hash: '69ad83b324531f979aca7a56cc32047c',
                            namespace: 'namespace',
                            operationName: 'changeUser',
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[3].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });

                        expect(response[4].subscribers.has(ref2)).to.be.true;
                        expect(response[4]).to.deep.equal({
                            args: {
                                name: 'Rohde'
                            },
                            contextValue: {
                                auth: {},
                                auth2: {}
                            },
                            event: 'anotherEvent',
                            hash: '84e15e7de349e804f7ec7db0dfe91c03',
                            namespace: 'namespace',
                            operationName: null,
                            result: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            rootValue: {
                                age: 20
                            },
                            rootName: 'user',
                            subscribers: response[4].subscribers,
                            variableValues: {
                                name: 'Rohde'
                            }
                        });
                    }, null, done);

                subscriptions.run('inexistentNamespace', event, {
                    age: 20
                }, {
                    auth2: {}
                });

                subscriptions.run(namespace, 'inexistentEvent', {
                    age: 20
                }, {
                    auth2: {}
                });

                subscriptions.run(namespace, event, {
                    age: 20
                }, {
                    auth2: {}
                });

                subscriptions.run(namespace, 'anotherEvent', {
                    age: 20
                }, {
                    auth2: {}
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
            subscriptions.run(namespace, event);
            expect(subscriptions.inbound.next).to.have.been.calledWith({
                event,
                namespace,
                rootValue: {},
                extendContextValue: {}
            });
        });

        it('should call inbound.next with custom root and extendContext', () => {
            subscriptions.run(namespace, event, {
                rootValue: 'root'
            }, {
                contextValue: 'context'
            });

            expect(subscriptions.inbound.next).to.have.been.calledWith({
                event,
                namespace,
                rootValue: {
                    rootValue: 'root'
                },
                extendContextValue: {
                    contextValue: 'context'
                }
            });
        });
    });

    describe('subscribe', () => {
        beforeEach(() => {
            sinon.spy(subscriptions, 'getASTData');
        });

        afterEach(() => {
            subscriptions.getASTData.restore();
        });

        it('should do nothing if no namespace', () => {
            expect(subscriptions.subscribe()).to.be.undefined;
            expect(subscriptions.getASTData).not.to.have.been.called;
        });

        it('should do nothing if no subscriber', () => {
            expect(subscriptions.subscribe({})).to.be.undefined;
            expect(subscriptions.getASTData).not.to.have.been.called;
        });

        it('should do nothing if no subscription', () => {
            expect(subscriptions.subscribe(namespace, {})).to.be.undefined;
            expect(subscriptions.getASTData).not.to.have.been.called;
        });

        it('should throw if subscriber not object', () => {
            expect(() => subscriptions.subscribe('string', namespace, `subscription {user{name}}`)).to.throw('Subscriber must be an object.');
        });

        it('should throw if context not plain object', () => {
            expect(() => subscriptions.subscribe(namespace, {}, `subscription {user{name}}`, {}, new Map())).to.throw('contextValue should be a plain object.');
        });

        it('should throw if multiple roots', () => {
            expect(() => subscriptions.subscribe(namespace, {}, `subscription changeUser{user{name} user{name}}`)).to.throw('GraphQLError: Subscription "changeUser" must have only one field.');
        });

        it('should throw if fragments', () => {
            expect(() => subscriptions.subscribe(namespace, {}, `
                subscription changeUser {
                    ...userInfo
                }

                fragment userInfo on SubscriptionType {
                    user {
                        name
                    }
                }
            `)).to.throw('GraphQLError: Subscriptions do not support fragments on the root field.');
        });

        it('should return hashes based on query, variables and context', () => {
            const sub1 = subscriptions.subscribe(namespace, {}, queries[0], {
                age: 20
            });

            const sub2 = subscriptions.subscribe(namespace, {}, queries[0], {
                age: 20
            });

            const sub3 = subscriptions.subscribe(namespace, {}, queries[1], {
                age: 20
            });

            const sub4 = subscriptions.subscribe(namespace, {}, queries[1], {
                age: 21
            });

            const sub5 = subscriptions.subscribe(namespace, {}, queries[1], {
                age: 21
            }, {
                auth: {}
            });

            const sub6 = subscriptions.subscribe(namespace, {}, queries[2], {
                age: 21
            }, {
                auth: {}
            });

            const sub7 = subscriptions.subscribe(namespace, {}, queries[3], {
                age: 21
            }, {
                auth: {}
            });

            expect(sub1).to.deep.equal([
                'namespace.event.9bf2218dde7d577a41692bcd2faa5a24',
                'namespace.anotherEvent.9bf2218dde7d577a41692bcd2faa5a24'
            ]);

            expect(sub2).to.deep.equal([
                'namespace.event.9bf2218dde7d577a41692bcd2faa5a24',
                'namespace.anotherEvent.9bf2218dde7d577a41692bcd2faa5a24'
            ]);

            expect(sub3).to.deep.equal([
                'namespace.event.c45682c768a5c33d31721e0b221d0202',
                'namespace.anotherEvent.c45682c768a5c33d31721e0b221d0202'
            ]);

            expect(sub4).to.deep.equal([
                'namespace.event.bd85b637bc7b30cb50da4f3c8110767d',
                'namespace.anotherEvent.bd85b637bc7b30cb50da4f3c8110767d'
            ]);

            expect(sub5).to.deep.equal([
                'namespace.event.947cadfd8f79a212fb1388b2d2b38f77',
                'namespace.anotherEvent.947cadfd8f79a212fb1388b2d2b38f77'
            ]);

            expect(sub6).to.deep.equal([
                'namespace.event.f8169b1cbc882d5a9bd319fdc5092c06'
            ]);

            expect(sub7).to.deep.equal([]);

            expect(_.isEqual(sub1, sub2)).to.be.true;
            expect(_.isEqual(sub2, sub3)).to.be.false;
            expect(_.isEqual(sub3, sub4)).to.be.false;
            expect(_.isEqual(sub4, sub5)).to.be.false;
        });

        it('should create subscriptions for all namespaces and events', () => {
            const sub1 = subscriptions.subscribe(namespace, {}, queries[0], {
                age: 20
            });

            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.executor`)).to.be.a('function');
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`)).to.be.a('Set');
            });
        });

        it('should add subscribers', () => {
            const subscribe1 = ref => subscriptions.subscribe(namespace, ref, queries[0]);
            const subscribe2 = ref => subscriptions.subscribe(namespace, ref, queries[1]);

            const ref1 = {};
            const sub1 = subscribe1(ref1);

            const ref2 = {};
            const sub2 = subscribe1(ref2);
            const sub2_1 = subscribe2(ref2);

            const ref3 = {};
            const sub3 = subscribe2(ref3);

            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).size).to.equal(2);
                expect(_.get(ref1, subscriptions.subscribedSymbol).has(sub)).to.be.true;
            });

            _.each(sub2, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).size).to.equal(2);
                expect(_.get(ref2, subscriptions.subscribedSymbol).has(sub)).to.be.true;
            });

            _.each(sub2_1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).size).to.equal(2);
                expect(_.get(ref2, subscriptions.subscribedSymbol).has(sub)).to.be.true;
            });

            _.each(sub3, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).size).to.equal(2);
                expect(_.get(ref3, subscriptions.subscribedSymbol).has(sub)).to.be.true;
            });
        });

        it('should reuse shallow identic queries', () => {
            const sub1 = subscriptions.subscribe(namespace, {}, queries[0], {
                age: 20
            });

            const sub2 = subscriptions.subscribe(namespace, {}, queries[0], {
                age: 20
            });

            _.each(sub1, (sub, index) => {
                expect(_.get(subscriptions.subscriptions, sub)).to.equal(_.get(subscriptions.subscriptions, sub2[index]));
            });

            expect(_.size(_.get(subscriptions.subscriptions, `${namespace}.${event}`))).to.equal(1);
        });

        it('should not reuse shallow different queries', () => {
            const sub1 = subscriptions.subscribe(namespace, {}, queries[0], {
                age: 20
            });

            const sub2 = subscriptions.subscribe(namespace, {}, queries[1], {
                age: 20
            });

            _.each(sub1, (sub, index) => {
                expect(_.get(subscriptions.subscriptions, sub)).not.to.equal(_.get(subscriptions.subscriptions, sub2[index]));
            });

            expect(_.size(_.get(subscriptions.subscriptions, `${namespace}.${event}`))).to.equal(2);
        });
    });

    describe('unsubscribe', () => {
        const subscribe1 = ref => subscriptions.subscribe(namespace, ref, queries[0]);
        const subscribe2 = ref => subscriptions.subscribe(namespace, ref, queries[1]);
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
            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref1)).to.be.true;
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref2)).to.be.true;
            });

            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(2);

            subscriptions.unsubscribe(ref1);

            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref1)).to.be.false;
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref2)).to.be.true;
            });

            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(0);
        });

        it('should unsubscribe ref1 and ref2 and remove subscribe1 from subscriptions', () => {
            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref1)).to.be.true;
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref2)).to.be.true;
            });

            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(2);
            expect(_.get(ref2, subscriptions.subscribedSymbol).size).to.equal(4);

            subscriptions.unsubscribe(ref1);
            subscriptions.unsubscribe(ref2);

            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, sub)).to.be.undefined;
            });

            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(0);
            expect(_.get(ref2, subscriptions.subscribedSymbol).size).to.equal(0);
        });

        it('should unsubscribe ref1 only on sub2', () => {
            sub1 = subscriptions.subscribe(namespace, ref1, queries[0]);
            sub2 = subscriptions.subscribe(namespace, ref1, queries[2]);

            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref1)).to.be.true;
            });

            _.each(sub2, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref1)).to.be.true;
            });

            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(3);

            _.each(sub2, sub => {
                subscriptions.unsubscribe(ref1, sub);
            });

            _.each(sub1, sub => {
                expect(_.get(subscriptions.subscriptions, `${sub}.subscribers`).has(ref1)).to.be.true;
            });

            _.each(sub2, sub => {
                expect(_.get(subscriptions.subscriptions, sub)).to.be.undefined;
            });

            expect(_.get(ref1, subscriptions.subscribedSymbol).size).to.equal(2);
        });
    });

    describe('getASTData', () => {
        it('should extract query data from parsed query', () => {
            const parsedQuery = parse(queries[0]);

            expect(subscriptions.getASTData(schema, parsedQuery, {
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
                events: [
                    'event',
                    'anotherEvent'
                ],
                operationName: 'changeUser',
                rootAlias: null,
                rootName: 'user'
            }]);
        });

        it('should return an array of string events', () => {
            const parsedQuery = parse(queries[0]);

            expect(subscriptions.getASTData(schema, parsedQuery)[0].events).to.deep.equal([
                'event',
                'anotherEvent'
            ]);
        });

        it('should return an array of string events even when declared as string', () => {
            const parsedQuery = parse(queries[2]);

            expect(subscriptions.getASTData(schema, parsedQuery)[0].events).to.deep.equal([
                'event'
            ]);
        });

        it('should return null if no subscription event', () => {
            const parsedQuery = parse(queries[0]);

            expect(subscriptions.getASTData(noSubscriptionSchema, parsedQuery, {
                name: 'Rohde',
                age: 20,
                city: 'San Francisco',
                unknownVariable: null
            })).to.be.null;
        });
    });
});
