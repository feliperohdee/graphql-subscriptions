const {
    Selection,
    GraphQLError,
} = require('graphql');

const tooManySubscriptionFieldsError = subscriptionName => {
    if (subscriptionName) {
        return `Subscription "${subscriptionName}" must have only one field.`;
    }

    return `Subscription must have only one field.`;
}

exports.subscriptionHasSingleRootField = context => {
    return {
        OperationDefinition: node => {
            const operationName = node.name ? node.name.value : '';
            let numFields = 0;

            node.selectionSet.selections
                .forEach(selection => {
                    if (selection.kind === 'Field') {
                        numFields++;
                    } else {
                        context.reportError(new GraphQLError('Small Orange subscriptions do not support fragments on the root field', [
                            node
                        ]));
                    }
                });

            if (numFields > 1) {
                context.reportError(new GraphQLError(tooManySubscriptionFieldsError(operationName), [
                    node
                ]));
            }

            return false;
        }
    };
}
