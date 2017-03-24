const _ = require('lodash');
const Subscriptions = require('./Subscriptions');

module.exports = class FlowControl {
	constructor(subscriptions, operations, defaultCallback) {
		if (!(subscriptions instanceof Subscriptions)) {
			throw new Error('subscriptions must be instance of Subscriptions');
		}

		if (!_.isObject(operations)) {
			throw new Error('operations must be an object');
		}

		if (!_.isFunction(defaultCallback)) {
			throw new Error('defaultCallback must be a function');
		}

		this.operations = operations;
		this.defaultCallback = defaultCallback;
		this.stream = subscriptions.stream
			.do(response => {
				const {
					type
				} = response;

				if (!this.operations[type]) {
					return;
				}

				this.operations[type](response, this.push.bind(this));
			});
	}

	push(response, filter = () => true, callback = null) {
		const {
			subscribers
		} = response;

		if (!subscribers || !subscribers.forEach) {
			throw new Error('subscribers must be an Array or Set');
		}

		if(!_.isFunction(callback)){
			callback = this.defaultCallback.bind(this.defaultCallback);
		}

		subscribers.forEach(subscriber => {
			if (!filter(response, subscriber)) {
				return;
			}

			callback(response, subscriber);
		});
	}

	subscribe(next, error, complete){
		return this.stream
			.subscribe(next, error, complete);
	}
}
