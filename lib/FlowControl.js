const _ = require('lodash');
const Subscriptions = require('./Subscriptions');

module.exports = class FlowControl {
	constructor(subscriptions, operations, callback) {
		if (!(subscriptions instanceof Subscriptions)) {
			throw new Error('subscriptions must be instance of Subscriptions');
		}

		if (!_.isObject(operations)) {
			throw new Error('operations must be an object');
		}

		if (!_.isFunction(callback)) {
			throw new Error('callback must be a function');
		}

		this.operations = operations;
		this.callback = callback;
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

	push(response, filter = () => true) {
		const {
			subscribers
		} = response;

		if (!subscribers || !subscribers.forEach) {
			throw new Error('subscribers must be an Array or Set');
		}

		subscribers.forEach(subscriber => {
			if (!filter(response, subscriber)) {
				return;
			}

			this.callback(response, subscriber);
		});
	}

	subscribe(next, error, complete){
		return this.stream
			.subscribe(next, error, complete);
	}
}
