const {
    Selection,
    GraphQLError,
} = require('graphql');

exports.subscriptionHasSingleRootField = context => {
    return {
        OperationDefinition: node => {
            const operationName = node.name ? node.name.value : '';
            let numFields = 0;

            if (!operationName) {
                context.reportError(new GraphQLError('Small Orange subscriptions must have an operationName', [
                    node
                ]));
            }

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
                context.reportError(new GraphQLError(`Subscription "${operationName}" must have only one field.`, [
                    node
                ]));
            }

            return false;
        }
    };
}
